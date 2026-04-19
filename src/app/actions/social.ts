"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  UserReportStatus,
  GroupJoinRequestStatus,
  GroupMembershipRole,
  GroupPrivacy,
  NotificationType,
} from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { savePublicImage } from "@/lib/upload";
import { slugify } from "@/lib/slug";
import type { ActionState } from "@/lib/http";
import { normalizeUsername } from "@/lib/username";
import { safeRevalidatePath, toSafeInternalPath } from "@/lib/navigation";
import { parseCoordinate } from "@/lib/geo";
import { assertRateLimit } from "@/lib/rate-limit";
import { createAdminAuditLog } from "@/lib/admin-audit";
import { conversationTopic, eventTopic, groupTopic, publishRealtimeEvent, userTopic } from "@/lib/realtime";
import { sendTelegramAlert } from "@/lib/telegram";
import { queuePushNotificationForUser } from "@/lib/web-push";
import { buildPostContent, parsePostContent } from "@/lib/post-content";
import { purgeTemporaryPosts } from "@/lib/post-maintenance";
import { listHighlightedStoryIdsForUser } from "@/lib/story-metadata";
import { parseVenueHoursFromFormData, saveVenueHours } from "@/lib/venue-hours";
import { toggleStoryReactionForUser } from "@/lib/story-reactions";
import { canUserAccessEventChat } from "@/features/events/event.service";
import { clampFormValue, readFormValue } from "@/lib/form-data";
import { createStoryForUser } from "@/lib/story-service";

function getConversationPair(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort();
}

async function isBlockedEitherWay(userIdA: string, userIdB: string) {
  const block = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
    select: { id: true },
  });

  return Boolean(block);
}

async function ensureGroupOwner(groupId: string, userId: string) {
  return db.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });
}

function publishUserRefresh(userIds: string[], type: string, entityId?: string) {
  const topics = [...new Set(userIds.filter(Boolean))].map((userId) => userTopic(userId));
  publishRealtimeEvent(topics, { type, entityId });
}

async function resolveRelatedOpenReports(filter: {
  reportedUserId?: string;
  postId?: string;
  postCommentId?: string;
  groupMessageId?: string;
  eventChatMessageId?: string;
  directMessageId?: string;
}) {
  await db.userReport.updateMany({
    where: {
      ...filter,
      status: UserReportStatus.OPEN,
    },
    data: {
      status: UserReportStatus.RESOLVED,
      adminNotes: "Ocultado automaticamente por acumulacion de reportes.",
      resolvedAt: new Date(),
    },
  }).catch(() => null);
}

async function autoHideReportedContent(payload: {
  postId?: string;
  postCommentId?: string;
  groupMessageId?: string;
  eventChatMessageId?: string;
  directMessageId?: string;
}) {
  const reportCount = await db.userReport.count({
    where: {
      ...payload,
      status: UserReportStatus.OPEN,
    },
  });

  if (reportCount < 3) {
    return;
  }

  if (payload.postId) {
    await db.post.update({ where: { id: payload.postId }, data: { hiddenAt: new Date() } }).catch(() => null);
    await resolveRelatedOpenReports({ postId: payload.postId });
    return;
  }

  if (payload.postCommentId) {
    await db.postComment.update({ where: { id: payload.postCommentId }, data: { hiddenAt: new Date() } }).catch(() => null);
    await resolveRelatedOpenReports({ postCommentId: payload.postCommentId });
    return;
  }

  if (payload.groupMessageId) {
    await db.groupMessage.update({ where: { id: payload.groupMessageId }, data: { hiddenAt: new Date() } }).catch(() => null);
    await resolveRelatedOpenReports({ groupMessageId: payload.groupMessageId });
    return;
  }

  if (payload.eventChatMessageId) {
    await db.eventChatMessage.update({ where: { id: payload.eventChatMessageId }, data: { hiddenAt: new Date() } }).catch(() => null);
    await resolveRelatedOpenReports({ eventChatMessageId: payload.eventChatMessageId });
    return;
  }

  if (payload.directMessageId) {
    await db.directMessage.update({ where: { id: payload.directMessageId }, data: { hiddenAt: new Date() } }).catch(() => null);
    await resolveRelatedOpenReports({ directMessageId: payload.directMessageId });
  }
}

export async function followUserAction(formData: FormData) {
  const currentUser = await requireAuth();
  const targetUserId = readFormValue(formData.get("targetUserId"));
  const redirectPath = toSafeInternalPath(readFormValue(formData.get("redirectPath")), "/search");

  if (!targetUserId || targetUserId === currentUser.id) {
    return;
  }

  const [targetUser, blocked] = await Promise.all([
    db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    }),
    isBlockedEitherWay(currentUser.id, targetUserId),
  ]);

  if (!targetUser || blocked) {
    return;
  }

  const existing = await db.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUser.id,
        followingId: targetUserId,
      },
    },
  });

  if (existing) {
    await db.follow.delete({ where: { id: existing.id } });
  } else {
    await db.follow.create({
      data: {
        followerId: currentUser.id,
        followingId: targetUserId,
      },
    });

    const notification = await db.notification.create({
      data: {
        recipientId: targetUserId,
        actorId: currentUser.id,
        type: NotificationType.FOLLOW,
        title: "Nuevo seguidor",
        body: `${currentUser.username ?? currentUser.name ?? "Un usuario"} ha empezado a seguirte.`,
        link: `/u/${currentUser.username ?? ""}`,
      },
    }).catch(() => null);

    publishUserRefresh([targetUserId], "notification:new", notification?.id);
    if (notification) {
      await queuePushNotificationForUser({
        recipientId: targetUserId,
        notificationId: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
      });
    }
  }

  safeRevalidatePath(redirectPath, "/search");
  revalidatePath("/notifications");
  revalidatePath("/friends");
  publishUserRefresh([currentUser.id, targetUserId], "social:follow");
}

export async function blockUserAction(formData: FormData) {
  const currentUser = await requireAuth();
  const targetUserId = readFormValue(formData.get("targetUserId"));
  const redirectPath = toSafeInternalPath(readFormValue(formData.get("redirectPath")), "/search");

  if (!targetUserId || targetUserId === currentUser.id) {
    return;
  }

  const existing = await db.userBlock.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId: currentUser.id,
        blockedId: targetUserId,
      },
    },
  });

  if (existing) {
    await db.userBlock.delete({ where: { id: existing.id } });
  } else {
    await db.userBlock.create({
      data: {
        blockerId: currentUser.id,
        blockedId: targetUserId,
      },
    });

    await db.follow.deleteMany({
      where: {
        OR: [
          { followerId: currentUser.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: currentUser.id },
        ],
      },
    });
  }

  safeRevalidatePath(redirectPath, "/search");
  revalidatePath("/friends");
  publishUserRefresh([currentUser.id, targetUserId], "social:block");
}

export async function reportUserAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    const reportedUserId = readFormValue(formData.get("reportedUserId"));
    const reason = clampFormValue(formData.get("reason"), 240);

    if (!reportedUserId || !reason) {
      return { error: "Indica a quién reportas y el motivo." };
    }

    await db.userReport.create({
      data: {
        reporterId: currentUser.id,
        reportedUserId,
        reason,
      },
    });

    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((admin) => ({
          recipientId: admin.id,
          actorId: currentUser.id,
          type: NotificationType.USER_REPORT,
          title: "Nuevo reporte de usuario",
          body: reason,
          link: "/admin/venue-requests",
        })),
      }).catch(() => null);

      publishUserRefresh(admins.map((admin) => admin.id), "admin:report");
    }

    await sendTelegramAlert({
      title: "Nuevo reporte de usuario",
      lines: [
        `Reportado por: ${currentUser.username ?? currentUser.email ?? currentUser.id}`,
        `Usuario reportado: ${reportedUserId}`,
        `Motivo: ${reason}`,
      ],
    });

    return { success: "Reporte enviado." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo enviar el reporte." };
  }
}

export async function createPostAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await purgeTemporaryPosts();
    const currentUser = await requireAuth();
    await assertRateLimit({
      key: `post:create:${currentUser.id}`,
      limit: 12,
      windowMs: 10 * 60 * 1000,
      message: "Has publicado demasiado rápido. Espera un poco.",
      userId: currentUser.id,
    });

    const content = clampFormValue(formData.get("content"), 2_000);
    const location = clampFormValue(formData.get("location"), 120);
    const file = formData.get("image");
    const showOnProfile = readFormValue(formData.get("showOnProfile")) === "on";
    let imageUrl: string | null = null;

    if (content.length < 2) {
      return { error: "La publicación es demasiado corta." };
    }

    if (file instanceof File && file.size > 0) {
      imageUrl = await savePublicImage(file, "posts");
    }

    await db.post.create({
      data: {
        authorId: currentUser.id,
        content: buildPostContent(content, location || null),
        imageUrl,
        showOnProfile,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    if (currentUser.username) {
      revalidatePath(`/u/${currentUser.username}`);
    }
    publishUserRefresh([currentUser.id], "post:create");
    return { success: "Publicación creada." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear la publicación.",
    };
  }
}

export async function updatePostAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    const postId = readFormValue(formData.get("postId"));
    const content = clampFormValue(formData.get("content"), 2_000);
    const redirectPath = toSafeInternalPath(readFormValue(formData.get("redirectPath")), "/dashboard");

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, content: true },
    });

    if (!post || post.authorId !== currentUser.id) {
      return { error: "No puedes editar esta publicación." };
    }

    if (content.length < 2) {
      return { error: "La publicación es demasiado corta." };
    }

    await db.post.update({
      where: { id: postId },
      data: { content: buildPostContent(content, parsePostContent(post.content).location) },
    });

    safeRevalidatePath(redirectPath, "/dashboard");
    publishUserRefresh([currentUser.id], "post:update", postId);
    return { success: "Publicación actualizada." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo editar la publicación." };
  }
}

export async function deletePostAction(formData: FormData) {
  const currentUser = await requireAuth();
  const postId = readFormValue(formData.get("postId"));
  const redirectPath = toSafeInternalPath(readFormValue(formData.get("redirectPath")), "/dashboard");

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) return;

  if (post.authorId !== currentUser.id && currentUser.role !== "ADMIN") {
    return;
  }

  await db.post.update({
    where: { id: postId },
    data: { hiddenAt: new Date() },
  });

  if (currentUser.role === "ADMIN" && post.authorId !== currentUser.id) {
    await createAdminAuditLog({
      adminId: currentUser.id,
      action: "hide_post",
      targetType: "post",
      targetId: postId,
    });
  }

  safeRevalidatePath(redirectPath, "/dashboard");
  publishUserRefresh([currentUser.id, post.authorId], "post:delete", postId);
}

export async function createStoryAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    const { story } = await createStoryForUser(currentUser, formData);

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath(`/stories/${story.id}`);
    if (currentUser.username) {
      revalidatePath(`/u/${currentUser.username}`);
    }
    publishUserRefresh([currentUser.id], "story:create", story.id);
    return { success: "Historia publicada." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo publicar la historia." };
  }
}

export async function deleteStoryAction(formData: FormData): Promise<ActionState> {
  const currentUser = await requireAuth();
  const storyId = readFormValue(formData.get("storyId"));

  if (!storyId) return { error: "No se ha encontrado la historia." };

  const story = await db.story.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!story || story.authorId !== currentUser.id) {
    return { error: "No puedes eliminar esta historia." };
  }

  await db.story.delete({
    where: { id: storyId },
  }).catch(() => null);

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/profile/private");
  revalidatePath(`/stories/${storyId}`);
  if (currentUser.username) {
    revalidatePath(`/u/${currentUser.username}`);
  }
  publishUserRefresh([currentUser.id], "story:delete", storyId);
  return { success: "Has eliminado la historia." };
}

export async function toggleStoryHighlightAction(formData: FormData): Promise<ActionState> {
  const currentUser = await requireAuth();
  const storyId = readFormValue(formData.get("storyId"));

  if (!storyId) return { error: "No se ha encontrado la historia." };

  const story = await db.story.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!story || story.authorId !== currentUser.id) {
    return { error: "No puedes gestionar esta historia." };
  }

  const highlightedIds = await listHighlightedStoryIdsForUser(currentUser.id);
  const isHighlighted = highlightedIds.includes(storyId);

  await db.securityEvent.create({
    data: {
      type: "story_highlight",
      key: storyId,
      userId: currentUser.id,
      message: isHighlighted ? "unhighlighted" : "highlighted",
      metadata: JSON.stringify({ storyId }),
    },
  });

  revalidatePath("/profile");
  revalidatePath("/profile/private");
  if (currentUser.username) {
    revalidatePath(`/u/${currentUser.username}`);
  }
  revalidatePath(`/stories/${storyId}`);
  publishUserRefresh([currentUser.id], "story:highlight", storyId);
  return { success: isHighlighted ? "Has quitado la historia destacada." : "Has destacado la historia." };
}

export async function createGroupAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    await assertRateLimit({
      key: `group:create:${currentUser.id}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
      message: "Has creado demasiados grupos en poco tiempo.",
      userId: currentUser.id,
    });

    const name = readFormValue(formData.get("name"));
    const description = readFormValue(formData.get("description"));
    const privacy = readFormValue(formData.get("privacy")) === "PRIVATE" ? GroupPrivacy.PRIVATE : GroupPrivacy.PUBLIC;

    if (name.length < 3) {
      return { error: "El nombre del grupo es obligatorio." };
    }

    const baseSlug = slugify(name);
    let slug = baseSlug || `grupo-${Date.now()}`;
    let counter = 1;

    while (await db.group.findUnique({ where: { slug } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    await db.group.create({
      data: {
        ownerId: currentUser.id,
        name,
        slug,
        description: description || null,
        privacy,
        memberships: {
          create: {
            userId: currentUser.id,
            role: GroupMembershipRole.OWNER,
          },
        },
      },
    });

    revalidatePath("/groups");
    publishUserRefresh([currentUser.id], "group:create");
    return { success: "Grupo creado." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo crear el grupo." };
  }
}

export async function updateProfileAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    await assertRateLimit({
      key: `profile:update:${currentUser.id}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
      message: "Has actualizado el perfil demasiadas veces. Espera un poco.",
      userId: currentUser.id,
    });

    const name = clampFormValue(formData.get("name"), 80);
    const bio = clampFormValue(formData.get("bio"), 280);
    const city = clampFormValue(formData.get("city"), 60);
    const locationAddress = clampFormValue(formData.get("locationAddress"), 180);
    const latitude = parseCoordinate(formData.get("latitude"), "lat");
    const longitude = parseCoordinate(formData.get("longitude"), "lng");
    const requestedLocationMode = readFormValue(formData.get("locationSharingMode"));
    const desiredUsername = normalizeUsername(readFormValue(formData.get("username")));
    const avatar = formData.get("avatar");
    const isVenueProfile = currentUser.role === "VENUE" || currentUser.role === "VENUE_PENDING";
    const venueHours = isVenueProfile ? parseVenueHoursFromFormData(formData) : [];
    const locationSharingMode = isVenueProfile
      ? "GHOST"
      : requestedLocationMode === "EXACT"
        ? "EXACT"
        : requestedLocationMode === "APPROXIMATE"
          ? "APPROXIMATE"
          : "GHOST";
    const shareLocation = isVenueProfile ? false : locationSharingMode !== "GHOST";
    const isUsernameChange = Boolean(currentUser.username && currentUser.username !== desiredUsername);

    if (desiredUsername.length < 3) {
      return { error: "El username debe tener al menos 3 caracteres válidos." };
    }

    const username = desiredUsername;

    if (currentUser.username !== desiredUsername) {
      const existing = await db.user.findUnique({
        where: { username: desiredUsername },
        select: { id: true },
      });

      if (existing && existing.id !== currentUser.id) {
        return { error: "Ese username ya está en uso." };
      }
    }

    if (isUsernameChange && currentUser.role !== "ADMIN") {
      const usernameChangesThisMonth = await db.usernameChange.count({
        where: {
          userId: currentUser.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (usernameChangesThisMonth >= 3) {
        return { error: "Solo puedes cambiar tu username 3 veces cada 30 días." };
      }
    }

    let avatarUrl: string | undefined;

    if (avatar instanceof File && avatar.size > 0) {
      avatarUrl = await savePublicImage(avatar, "avatars");
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          name: name || null,
          bio: bio || null,
          city: city || null,
          username,
          shareLocation,
          locationSharingMode,
          latitude: isVenueProfile ? null : latitude,
          longitude: isVenueProfile ? null : longitude,
          locationSharedAt: isVenueProfile ? null : shareLocation && latitude != null && longitude != null ? new Date() : null,
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      });

      if (isUsernameChange) {
        await tx.usernameChange.create({
          data: {
            userId: currentUser.id,
            previousUsername: currentUser.username,
            nextUsername: username,
          },
        });
      }
    });

    if (isVenueProfile) {
      await db.venueRequest.update({
        where: { userId: currentUser.id },
        data: {
          city: city || undefined,
          address: locationAddress || undefined,
          latitude,
          longitude,
        },
      }).catch(() => null);

      await saveVenueHours(currentUser.id, venueHours).catch(() => null);
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath("/map");
    revalidatePath("/profile/private");
    revalidatePath(`/u/${username}`);
    revalidatePath("/search");
    publishUserRefresh([currentUser.id], "profile:update");

    return { success: `Perfil actualizado como @${username}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo actualizar el perfil." };
  }
}

export async function toggleStoryReactionAction(formData: FormData): Promise<ActionState> {
  const currentUser = await requireAuth();
  const storyId = readFormValue(formData.get("storyId"));
  const reaction = readFormValue(formData.get("reaction"));

  if (!storyId || !reaction) {
    return { error: "No se ha podido reaccionar a la historia." };
  }

  const story = await db.story.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!story || story.authorId === currentUser.id) {
    return { error: "No se ha podido reaccionar a la historia." };
  }

  const currentUserReaction = await toggleStoryReactionForUser({
    storyId,
    userId: currentUser.id,
    reaction,
  });

  revalidatePath(`/stories/${storyId}`);
  publishUserRefresh([currentUser.id, story.authorId], "story:reaction", storyId);
  return {
    success: currentUserReaction ? "Reaccion enviada." : "Reaccion eliminada.",
    data: {
      currentUserReaction: currentUserReaction ?? null,
    },
  };
}

export async function toggleGroupMembershipAction(formData: FormData) {
  const currentUser = await requireAuth();
  const groupId = readFormValue(formData.get("groupId"));
  if (!groupId) return;

  const existing = await db.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: currentUser.id,
      },
    },
  });

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { id: true, ownerId: true, name: true, privacy: true },
  });

  if (!group) return;

  if (existing) {
    if (existing.role !== GroupMembershipRole.OWNER) {
      await db.groupMembership.delete({ where: { id: existing.id } });
    }
    revalidatePath("/groups");
    publishUserRefresh([currentUser.id], "group:membership", groupId);
    publishRealtimeEvent([groupTopic(groupId)], { type: "group:refresh", entityId: groupId });
    return;
  }

  const invite = await db.groupInvite.findUnique({
    where: {
      groupId_invitedUserId: {
        groupId,
        invitedUserId: currentUser.id,
      },
    },
  });

  if (group.privacy === GroupPrivacy.PUBLIC || Boolean(invite && !invite.rejectedAt)) {
    await db.groupMembership.create({
      data: {
        groupId,
        userId: currentUser.id,
      },
    });

    if (invite) {
      await db.groupInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    }
  } else {
    await db.groupJoinRequest.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId: currentUser.id,
        },
      },
      update: {
        status: GroupJoinRequestStatus.PENDING,
        reviewedAt: null,
        reviewedById: null,
      },
      create: {
        groupId,
        userId: currentUser.id,
      },
    });

    await db.notification.create({
      data: {
        recipientId: group.ownerId,
        actorId: currentUser.id,
        type: NotificationType.GROUP_REQUEST,
        title: "Nueva solicitud para tu grupo",
        body: `${currentUser.username ?? currentUser.name ?? "Un usuario"} quiere entrar en ${group.name}.`,
        link: `/groups/${groupId}`,
      },
    }).catch(() => null);

    publishUserRefresh([group.ownerId], "notification:new", groupId);
  }

  revalidatePath("/groups");
  publishUserRefresh([currentUser.id], "group:membership", groupId);
  publishRealtimeEvent([groupTopic(groupId)], { type: "group:refresh", entityId: groupId });
}

export async function inviteToGroupAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    const groupId = readFormValue(formData.get("groupId"));
    const username = normalizeUsername(readFormValue(formData.get("username")));

    const membership = await ensureGroupOwner(groupId, currentUser.id);
    if (!membership || membership.role !== "OWNER") {
      return { error: "Solo el creador puede invitar personas." };
    }

    const invitedUser = await db.user.findUnique({
      where: { username },
      select: { id: true, username: true },
    });

    if (!invitedUser) {
      return { error: "Ese usuario no existe." };
    }

    await db.groupInvite.upsert({
      where: {
        groupId_invitedUserId: {
          groupId,
          invitedUserId: invitedUser.id,
        },
      },
      update: {
        invitedById: currentUser.id,
        acceptedAt: null,
        rejectedAt: null,
      },
      create: {
        groupId,
        invitedUserId: invitedUser.id,
        invitedById: currentUser.id,
      },
    });

    await db.notification.create({
      data: {
        recipientId: invitedUser.id,
        actorId: currentUser.id,
        type: NotificationType.GROUP_INVITE,
        title: "Invitación a grupo",
        body: `@${currentUser.username ?? "usuario"} te ha invitado a un grupo.`,
        link: "/groups",
      },
    }).catch(() => null);

    revalidatePath("/groups");
    publishUserRefresh([currentUser.id, invitedUser.id], "group:invite", groupId);
    return { success: "Invitación enviada." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo enviar la invitación." };
  }
}

export async function reviewGroupJoinRequestAction(formData: FormData) {
  const currentUser = await requireAuth();
  const requestId = readFormValue(formData.get("requestId"));
  const decision = readFormValue(formData.get("decision"));
  if (!requestId) return;

  const request = await db.groupJoinRequest.findUnique({
    where: { id: requestId },
    include: {
      group: {
        select: { id: true, ownerId: true },
      },
      user: {
        select: { id: true },
      },
    },
  });

  if (!request || request.group.ownerId !== currentUser.id) {
    return;
  }

  const approve = decision === "approve";

  await db.groupJoinRequest.update({
    where: { id: requestId },
    data: {
      status: approve ? GroupJoinRequestStatus.APPROVED : GroupJoinRequestStatus.REJECTED,
      reviewedAt: new Date(),
      reviewedById: currentUser.id,
    },
  });

  if (approve) {
    await db.groupMembership.upsert({
      where: {
        groupId_userId: {
          groupId: request.group.id,
          userId: request.user.id,
        },
      },
      update: {},
      create: {
        groupId: request.group.id,
        userId: request.user.id,
      },
    });
  }

  revalidatePath(`/groups/${request.group.id}`);
  revalidatePath("/groups");
  publishUserRefresh([currentUser.id, request.user.id], "group:review", request.group.id);
  publishRealtimeEvent([groupTopic(request.group.id)], { type: "group:refresh", entityId: request.group.id });
}

export async function respondGroupInviteAction(formData: FormData) {
  const currentUser = await requireAuth();
  const inviteId = readFormValue(formData.get("inviteId"));
  const decision = readFormValue(formData.get("decision"));
  if (!inviteId) return;

  const invite = await db.groupInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      groupId: true,
      invitedUserId: true,
    },
  });

  if (!invite || invite.invitedUserId !== currentUser.id) return;

  if (decision === "accept") {
    await db.groupInvite.update({
      where: { id: inviteId },
      data: { acceptedAt: new Date(), rejectedAt: null },
    });
    await db.groupMembership.upsert({
      where: {
        groupId_userId: {
          groupId: invite.groupId,
          userId: currentUser.id,
        },
      },
      update: {},
      create: {
        groupId: invite.groupId,
        userId: currentUser.id,
      },
    });
  } else {
    await db.groupInvite.update({
      where: { id: inviteId },
      data: { rejectedAt: new Date() },
    });
  }

  revalidatePath("/groups");
  publishUserRefresh([currentUser.id], "group:invite-response", invite.groupId);
  publishRealtimeEvent([groupTopic(invite.groupId)], { type: "group:refresh", entityId: invite.groupId });
}

export async function sendGroupMessageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    await assertRateLimit({
      key: `group:message:${currentUser.id}`,
      limit: 40,
      windowMs: 5 * 60 * 1000,
      message: "Estás enviando mensajes demasiado rápido.",
    });
    const groupId = readFormValue(formData.get("groupId"));
    const body = clampFormValue(formData.get("body"), 2_000);

    if (!groupId || body.length < 1) {
      return { error: "Escribe un mensaje válido." };
    }

    const membership = await db.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: currentUser.id,
        },
      },
      include: {
        group: { select: { name: true } },
      },
    });

    if (!membership) {
      return { error: "Tienes que unirte al grupo para escribir." };
    }

    const message = await db.groupMessage.create({
      data: {
        groupId,
        authorId: currentUser.id,
        body,
      },
    });

    const members = await db.groupMembership.findMany({
      where: {
        groupId,
        userId: { not: currentUser.id },
      },
      select: { userId: true },
    });

    if (members.length > 0) {
      await db.notification.createMany({
        data: members.map((member) => ({
          recipientId: member.userId,
          actorId: currentUser.id,
          type: NotificationType.GROUP_MESSAGE,
          title: `Nuevo mensaje en ${membership.group.name}`,
          body: `${currentUser.username ?? currentUser.name ?? "Un usuario"} ha escrito en el grupo.`,
          link: `/groups/${groupId}`,
        })),
      }).catch(() => null);

      publishUserRefresh(members.map((member) => member.userId), "notification:new", groupId);
    }

    revalidatePath(`/groups/${groupId}`);
    publishRealtimeEvent([groupTopic(groupId)], { type: "group:message", entityId: message.id });
    publishUserRefresh([currentUser.id], "group:message", groupId);
    return { success: "Mensaje enviado." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo enviar el mensaje." };
  }
}

export async function deleteGroupMessageAction(formData: FormData) {
  const currentUser = await requireAuth();
  const messageId = readFormValue(formData.get("messageId"));

  const message = await db.groupMessage.findUnique({
    where: { id: messageId },
    include: {
      group: { select: { id: true, ownerId: true } },
    },
  });

  if (!message) return;

  const canDelete =
    message.authorId === currentUser.id || message.group.ownerId === currentUser.id || currentUser.role === "ADMIN";
  if (!canDelete) return;

  await db.groupMessage.update({
    where: { id: messageId },
    data: { hiddenAt: new Date() },
  });

  if (currentUser.role === "ADMIN" && message.authorId !== currentUser.id) {
    await createAdminAuditLog({
      adminId: currentUser.id,
      action: "hide_group_message",
      targetType: "group_message",
      targetId: messageId,
    });
  }

  revalidatePath(`/groups/${message.group.id}`);
  publishRealtimeEvent([groupTopic(message.group.id)], { type: "group:message-delete", entityId: messageId });
}

export async function markGroupReadAction(groupId: string) {
  const currentUser = await requireAuth();

  await db.groupMembership.update({
    where: {
      groupId_userId: {
        groupId,
        userId: currentUser.id,
      },
    },
    data: {
      lastReadAt: new Date(),
    },
  }).catch(() => null);

  publishUserRefresh([currentUser.id], "group:read", groupId);
}

export async function togglePostLikeAction(formData: FormData) {
  const currentUser = await requireAuth();
  const postId = readFormValue(formData.get("postId"));
  const redirectPath = toSafeInternalPath(readFormValue(formData.get("redirectPath")), "/dashboard");
  if (!postId) return;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      hiddenAt: true,
      author: { select: { username: true } },
    },
  });

  if (!post || post.hiddenAt) return;

  const existing = await db.postLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: currentUser.id,
      },
    },
  });

  if (existing) {
    await db.postLike.delete({ where: { id: existing.id } });
  } else {
    await db.postLike.create({
      data: {
        postId,
        userId: currentUser.id,
      },
    });

    if (post.authorId !== currentUser.id) {
      await db.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: currentUser.id,
          type: NotificationType.POST_LIKE,
          title: "Nuevo like",
          body: `A @${currentUser.username ?? "usuario"} le ha gustado tu publicación.`,
          link: `/posts/${postId}`,
        },
      }).catch(() => null);

      publishUserRefresh([post.authorId], "notification:new", postId);
    }
  }

  safeRevalidatePath(redirectPath, "/dashboard");
  revalidatePath("/notifications");
  publishUserRefresh([currentUser.id, post.authorId], "post:like", postId);
}

export async function createPostCommentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    await assertRateLimit({
      key: `post:comment:${currentUser.id}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
      message: "Estás comentando demasiado rápido.",
    });
    const postId = readFormValue(formData.get("postId"));
    const redirectPath = toSafeInternalPath(readFormValue(formData.get("redirectPath")), "/dashboard");
    const body = clampFormValue(formData.get("body"), 500);

    if (!postId || body.length < 1) {
      return { error: "Escribe un comentario válido." };
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      select: {
        authorId: true,
        hiddenAt: true,
        author: { select: { username: true } },
      },
    });

    if (!post || post.hiddenAt) {
      return { error: "La publicación no existe." };
    }

    await db.postComment.create({
      data: {
        postId,
        authorId: currentUser.id,
        body,
      },
    });

    if (post.authorId !== currentUser.id) {
      await db.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: currentUser.id,
          type: NotificationType.POST_COMMENT,
          title: "Nuevo comentario",
          body: `@${currentUser.username ?? "usuario"} ha comentado tu publicación.`,
          link: `/posts/${postId}`,
        },
      }).catch(() => null);

      publishUserRefresh([post.authorId], "notification:new", postId);
    }

    safeRevalidatePath(redirectPath, "/dashboard");
    revalidatePath("/notifications");
    publishUserRefresh([currentUser.id, post.authorId], "post:comment", postId);
    return { success: "Comentario publicado." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo publicar el comentario." };
  }
}

export async function updatePostCommentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    const commentId = readFormValue(formData.get("commentId"));
    const body = clampFormValue(formData.get("body"), 500);
    const redirectPath = toSafeInternalPath(readFormValue(formData.get("redirectPath")), "/dashboard");

    const comment = await db.postComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true },
    });

    if (!comment || comment.authorId !== currentUser.id) {
      return { error: "No puedes editar este comentario." };
    }

    await db.postComment.update({
      where: { id: commentId },
      data: { body },
    });

    safeRevalidatePath(redirectPath, "/dashboard");
    publishUserRefresh([currentUser.id], "comment:update", commentId);
    return { success: "Comentario actualizado." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo actualizar el comentario." };
  }
}

export async function deletePostCommentAction(formData: FormData) {
  const currentUser = await requireAuth();
  const commentId = readFormValue(formData.get("commentId"));
  const redirectPath = toSafeInternalPath(readFormValue(formData.get("redirectPath")), "/dashboard");

  const comment = await db.postComment.findUnique({
    where: { id: commentId },
    include: {
      post: { select: { authorId: true } },
    },
  });

  if (!comment) return;

  const canDelete =
    comment.authorId === currentUser.id || comment.post.authorId === currentUser.id || currentUser.role === "ADMIN";
  if (!canDelete) return;

  await db.postComment.update({
    where: { id: commentId },
    data: { hiddenAt: new Date() },
  });

  if (currentUser.role === "ADMIN" && comment.authorId !== currentUser.id) {
    await createAdminAuditLog({
      adminId: currentUser.id,
      action: "hide_post_comment",
      targetType: "post_comment",
      targetId: commentId,
    });
  }

  safeRevalidatePath(redirectPath, "/dashboard");
  publishUserRefresh([currentUser.id, comment.authorId, comment.post.authorId], "comment:delete", commentId);
}

export async function toggleCommentLikeAction(formData: FormData) {
  const currentUser = await requireAuth();
  const commentId = readFormValue(formData.get("commentId"));
  const redirectPath = toSafeInternalPath(readFormValue(formData.get("redirectPath")), "/dashboard");
  if (!commentId) return;

  const comment = await db.postComment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      postId: true,
      authorId: true,
      hiddenAt: true,
      author: { select: { username: true } },
    },
  });

  if (!comment || comment.hiddenAt) return;

  const existing = await db.commentLike.findUnique({
    where: {
      commentId_userId: {
        commentId,
        userId: currentUser.id,
      },
    },
  });

  if (existing) {
    await db.commentLike.delete({ where: { id: existing.id } });
  } else {
    await db.commentLike.create({
      data: {
        commentId,
        userId: currentUser.id,
      },
    });

    if (comment.authorId !== currentUser.id) {
      await db.notification.create({
        data: {
          recipientId: comment.authorId,
          actorId: currentUser.id,
          type: NotificationType.COMMENT_LIKE,
          title: "Nuevo like en comentario",
          body: `A @${currentUser.username ?? "usuario"} le ha gustado tu comentario.`,
          link: `/posts/${comment.postId}`,
        },
      }).catch(() => null);

      publishUserRefresh([comment.authorId], "notification:new", commentId);
    }
  }

  safeRevalidatePath(redirectPath, "/dashboard");
  publishUserRefresh([currentUser.id, comment.authorId], "comment:like", commentId);
}

export async function reportContentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    const reason = clampFormValue(formData.get("reason"), 240);
    const payload = {
      reporterId: currentUser.id,
      reason,
      postId: readFormValue(formData.get("postId")) || undefined,
      postCommentId: readFormValue(formData.get("postCommentId")) || undefined,
      groupMessageId: readFormValue(formData.get("groupMessageId")) || undefined,
      eventChatMessageId: readFormValue(formData.get("eventChatMessageId")) || undefined,
      directMessageId: readFormValue(formData.get("directMessageId")) || undefined,
      reportedUserId: readFormValue(formData.get("reportedUserId")) || undefined,
    };

    if (!reason) {
      return { error: "Añade un motivo para el reporte." };
    }

    await db.userReport.create({ data: payload });
    await autoHideReportedContent({
      postId: payload.postId,
      postCommentId: payload.postCommentId,
      groupMessageId: payload.groupMessageId,
      eventChatMessageId: payload.eventChatMessageId,
      directMessageId: payload.directMessageId,
    });

    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((admin) => ({
          recipientId: admin.id,
          actorId: currentUser.id,
          type: NotificationType.USER_REPORT,
          title: "Nuevo reporte de contenido",
          body: reason,
          link: "/admin/venue-requests",
        })),
      }).catch(() => null);

      publishUserRefresh(admins.map((admin) => admin.id), "admin:report");
    }

    await sendTelegramAlert({
      title: "Nuevo reporte de contenido",
      lines: [
        `Reportado por: ${currentUser.username ?? currentUser.email ?? currentUser.id}`,
        payload.postId ? `Post: ${payload.postId}` : "",
        payload.postCommentId ? `Comentario: ${payload.postCommentId}` : "",
        payload.groupMessageId ? `Mensaje de grupo: ${payload.groupMessageId}` : "",
        payload.eventChatMessageId ? `Mensaje de evento: ${payload.eventChatMessageId}` : "",
        payload.directMessageId ? `Mensaje privado: ${payload.directMessageId}` : "",
        payload.reportedUserId ? `Usuario: ${payload.reportedUserId}` : "",
        `Motivo: ${reason}`,
      ],
    });

    return { success: "Reporte enviado." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo enviar el reporte." };
  }
}

export async function openDirectConversationAction(formData: FormData) {
  const currentUser = await requireAuth();
  const targetUserId = readFormValue(formData.get("targetUserId"));

  if (!targetUserId || targetUserId === currentUser.id) {
    redirect("/messages");
  }

  const [targetUser, blocked] = await Promise.all([
    db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    }),
    isBlockedEitherWay(currentUser.id, targetUserId),
  ]);

  if (!targetUser || blocked) {
    redirect("/messages");
  }

  const [userAId, userBId] = getConversationPair(currentUser.id, targetUserId);

  const conversation = await db.directConversation.upsert({
    where: {
      userAId_userBId: {
        userAId,
        userBId,
      },
    },
    update: {},
    create: {
      userAId,
      userBId,
    },
  });

  redirect(`/messages/${conversation.id}`);
}

export async function sendDirectMessageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    await assertRateLimit({
      key: `direct:message:${currentUser.id}`,
      limit: 45,
      windowMs: 5 * 60 * 1000,
      message: "Estás enviando mensajes demasiado rápido.",
    });
    const conversationId = readFormValue(formData.get("conversationId"));
    const body = clampFormValue(formData.get("body"), 2_000);

    if (!conversationId || body.length < 1) {
      return { error: "Escribe un mensaje válido." };
    }

    const conversation = await db.directConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        userAId: true,
        userBId: true,
      },
    });

    if (!conversation || (conversation.userAId !== currentUser.id && conversation.userBId !== currentUser.id)) {
      return { error: "No puedes escribir en esta conversación." };
    }

    const recipientId = conversation.userAId === currentUser.id ? conversation.userBId : conversation.userAId;
    const blocked = await isBlockedEitherWay(currentUser.id, recipientId);
    if (blocked) {
      return { error: "No puedes escribir a este usuario." };
    }

    const [message] = await db.$transaction([
      db.directMessage.create({
        data: {
          conversationId,
          senderId: currentUser.id,
          body,
        },
      }),
      db.directConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    const notification = await db.notification.create({
      data: {
        recipientId,
        actorId: currentUser.id,
        type: NotificationType.DIRECT_MESSAGE,
        title: "Nuevo mensaje privado",
        body: `@${currentUser.username ?? "usuario"} te ha escrito por privado.`,
        link: `/messages/${conversationId}`,
      },
    }).catch(() => null);

    revalidatePath("/messages");
    revalidatePath(`/messages/${conversationId}`);
    revalidatePath("/notifications");
    publishRealtimeEvent([conversationTopic(conversationId)], {
      type: "conversation:message",
      entityId: message.id,
      actorId: currentUser.id,
      data: {
        messageId: message.id,
        body: message.body,
        senderId: currentUser.id,
        createdAt: message.createdAt.toISOString(),
      },
    });
    publishUserRefresh([recipientId], "notification:new", notification?.id);
    if (notification) {
      await queuePushNotificationForUser({
        recipientId,
        notificationId: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
      });
    }
    publishUserRefresh([currentUser.id, recipientId], "conversation:message", conversationId);
    return {
      success: "Mensaje enviado.",
      data: {
        messageId: message.id,
        body: message.body,
        senderId: currentUser.id,
        createdAt: message.createdAt.toISOString(),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo enviar el mensaje privado." };
  }
}

export async function deleteDirectMessageAction(formData: FormData) {
  const currentUser = await requireAuth();
  const messageId = readFormValue(formData.get("messageId"));

  const message = await db.directMessage.findUnique({
    where: { id: messageId },
    include: {
      conversation: { select: { id: true } },
    },
  });

  if (!message) return;

  if (message.senderId !== currentUser.id && currentUser.role !== "ADMIN") {
    return;
  }

  await db.directMessage.update({
    where: { id: messageId },
    data: { hiddenAt: new Date() },
  });

  if (currentUser.role === "ADMIN" && message.senderId !== currentUser.id) {
    await createAdminAuditLog({
      adminId: currentUser.id,
      action: "hide_direct_message",
      targetType: "direct_message",
      targetId: messageId,
    });
  }

  revalidatePath(`/messages/${message.conversation.id}`);
  publishRealtimeEvent([conversationTopic(message.conversation.id)], { type: "conversation:message-delete", entityId: messageId });
}

export async function markDirectConversationReadAction(conversationId: string) {
  const currentUser = await requireAuth();

  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      userAId: true,
      userBId: true,
    },
  });

  if (!conversation || (conversation.userAId !== currentUser.id && conversation.userBId !== currentUser.id)) {
    return;
  }

  await db.directMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: currentUser.id },
      hiddenAt: null,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  const otherUserId = conversation.userAId === currentUser.id ? conversation.userBId : conversation.userAId;
  publishRealtimeEvent([conversationTopic(conversationId)], {
    type: "conversation:read",
    entityId: conversationId,
    actorId: currentUser.id,
  });
  publishUserRefresh([currentUser.id, otherUserId], "conversation:read", conversationId);
}

export async function markNotificationsReadAction() {
  const currentUser = await requireAuth();

  await db.notification.updateMany({
    where: {
      recipientId: currentUser.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/notifications");
  publishUserRefresh([currentUser.id], "notification:read");
}

export async function updateLiveLocationAction(formData: FormData) {
  const currentUser = await requireAuth();
  if (currentUser.role === "VENUE" || currentUser.role === "VENUE_PENDING") return;
  if (currentUser.locationSharingMode === "GHOST") return;
  const latitude = parseCoordinate(formData.get("latitude"), "lat");
  const longitude = parseCoordinate(formData.get("longitude"), "lng");

  if (latitude == null || longitude == null) {
    return;
  }

  await db.user.update({
    where: { id: currentUser.id },
    data: {
      latitude,
      longitude,
      locationSharedAt: new Date(),
    },
  });

  revalidatePath("/map");
  publishUserRefresh([currentUser.id], "location:update");
}

export async function sendEventChatMessageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const currentUser = await requireAuth();
    await assertRateLimit({
      key: `event:message:${currentUser.id}`,
      limit: 40,
      windowMs: 5 * 60 * 1000,
      message: "Estas enviando mensajes demasiado rapido.",
    });

    const eventId = readFormValue(formData.get("eventId"));
    const body = clampFormValue(formData.get("body"), 1_500);

    if (!eventId || body.length < 1) {
      return { error: "Escribe un mensaje valido." };
    }

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        date: true,
        endDate: true,
      },
    });

    if (!event) {
      return { error: "Ese evento ya no existe." };
    }

    const hasAccess = await canUserAccessEventChat({
      eventId,
      userId: currentUser.id,
      role: currentUser.role,
      ownerId: event.ownerId,
    });

    if (!hasAccess) {
      return { error: "Necesitas una entrada confirmada para escribir en este chat." };
    }

    const accessWindowEndsAt = new Date((event.endDate ?? event.date).getTime() + 12 * 60 * 60 * 1000);

    if (new Date() > accessWindowEndsAt) {
      return { error: "El chat temporal de este evento ya ha finalizado." };
    }

    await db.eventChatParticipant.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: currentUser.id,
        },
      },
      update: {},
      create: {
        eventId,
        userId: currentUser.id,
      },
    });

    const message = await db.eventChatMessage.create({
      data: {
        eventId,
        authorId: currentUser.id,
        body,
      },
    });

    const recipients = await db.eventChatParticipant.findMany({
      where: {
        eventId,
        userId: { not: currentUser.id },
      },
      select: { userId: true },
    });

    if (recipients.length > 0) {
      await db.notification.createMany({
        data: recipients.map((participantUser) => ({
          recipientId: participantUser.userId,
          actorId: currentUser.id,
          type: NotificationType.EVENT_MESSAGE,
          title: `Nuevo mensaje en ${event.title}`,
          body: `${currentUser.username ?? currentUser.name ?? "Un usuario"} ha escrito en el chat del evento.`,
          link: `/events/${event.id}/chat`,
        })),
      }).catch(() => null);

      publishUserRefresh(recipients.map((recipient) => recipient.userId), "notification:new", eventId);
    }

    revalidatePath(`/events/${eventId}/chat`);
    publishRealtimeEvent([eventTopic(eventId)], { type: "event:message", entityId: message.id });
    return { success: "Mensaje enviado." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo enviar el mensaje." };
  }
}

export async function deleteEventChatMessageAction(formData: FormData) {
  const currentUser = await requireAuth();
  const messageId = readFormValue(formData.get("messageId"));

  const message = await db.eventChatMessage.findUnique({
    where: { id: messageId },
    include: {
      event: {
        select: {
          id: true,
          ownerId: true,
        },
      },
    },
  });

  if (!message) return;

  const canDelete = message.authorId === currentUser.id || message.event.ownerId === currentUser.id || currentUser.role === "ADMIN";
  if (!canDelete) return;

  await db.eventChatMessage.update({
    where: { id: messageId },
    data: { hiddenAt: new Date() },
  });

  if (currentUser.role === "ADMIN" && message.authorId !== currentUser.id) {
    await createAdminAuditLog({
      adminId: currentUser.id,
      action: "hide_event_chat_message",
      targetType: "event_chat_message",
      targetId: messageId,
    }).catch(() => null);
  }

  await resolveRelatedOpenReports({ eventChatMessageId: messageId });
  revalidatePath(`/events/${message.event.id}/chat`);
  publishRealtimeEvent([eventTopic(message.event.id)], { type: "event:message-delete", entityId: messageId });
}

export async function markEventChatReadAction(eventId: string) {
  const currentUser = await requireAuth();

  await db.eventChatParticipant.update({
    where: {
      eventId_userId: {
        eventId,
        userId: currentUser.id,
      },
    },
    data: {
      lastReadAt: new Date(),
    },
  }).catch(() => null);

  publishUserRefresh([currentUser.id], "event:read", eventId);
}

export async function resolveUserReportAction(formData: FormData) {
  const currentUser = await requireAuth();
  if (currentUser.role !== "ADMIN") return;

  const reportId = readFormValue(formData.get("reportId"));
  const decision = readFormValue(formData.get("decision"));
  const adminNotes = clampFormValue(formData.get("adminNotes"), 240);

  const report = await db.userReport.findUnique({
    where: { id: reportId },
    select: { id: true },
  });

  if (!report) return;

  await db.userReport.update({
    where: { id: reportId },
    data: {
      status: decision === "dismiss" ? UserReportStatus.DISMISSED : UserReportStatus.RESOLVED,
      adminNotes: adminNotes || null,
      resolvedAt: new Date(),
      resolvedById: currentUser.id,
    },
  });

  await createAdminAuditLog({
    adminId: currentUser.id,
    action: decision === "dismiss" ? "dismiss_report" : "resolve_report",
    targetType: "user_report",
    targetId: reportId,
    details: adminNotes || undefined,
  }).catch(() => null);

  revalidatePath("/admin/venue-requests");
}

export async function suspendUserAction(formData: FormData) {
  const currentUser = await requireAuth();
  if (currentUser.role !== "ADMIN") return;

  const userId = readFormValue(formData.get("userId"));
  const reason = clampFormValue(formData.get("reason"), 240);

  if (!userId || userId === currentUser.id) return;

  await db.user.update({
    where: { id: userId },
    data: {
      suspendedAt: new Date(),
      suspensionReason: reason || "Tu cuenta ha sido suspendida por moderacion.",
    },
  });

  await db.session.deleteMany({
    where: { userId },
  }).catch(() => null);

  await createAdminAuditLog({
    adminId: currentUser.id,
    action: "suspend_user",
    targetType: "user",
    targetId: userId,
    details: reason || undefined,
  }).catch(() => null);

  revalidatePath("/admin/venue-requests");
}

export async function unsuspendUserAction(formData: FormData) {
  const currentUser = await requireAuth();
  if (currentUser.role !== "ADMIN") return;

  const userId = readFormValue(formData.get("userId"));
  if (!userId) return;

  await db.user.update({
    where: { id: userId },
    data: {
      suspendedAt: null,
      suspensionReason: null,
    },
  });

  await createAdminAuditLog({
    adminId: currentUser.id,
    action: "unsuspend_user",
    targetType: "user",
    targetId: userId,
  }).catch(() => null);

  revalidatePath("/admin/venue-requests");
}



