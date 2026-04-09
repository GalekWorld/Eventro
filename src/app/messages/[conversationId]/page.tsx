import Link from "next/link";
import { ChevronLeft, ShieldCheck, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { DirectMessageForm } from "@/components/forms/direct-message-form";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { isBlockedBetween } from "@/lib/privacy";
import { markDirectConversationReadAction } from "@/app/actions/social";
import { DirectConversationClient } from "@/components/direct-conversation-client";

export default async function DirectConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const currentUser = await requireAuth();

  await markDirectConversationReadAction(conversationId);

  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
    include: {
      userA: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          isVerified: true,
          role: true,
        },
      },
      userB: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          isVerified: true,
          role: true,
        },
      },
      messages: {
        where: { hiddenAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!conversation || (conversation.userAId !== currentUser.id && conversation.userBId !== currentUser.id)) {
    notFound();
  }

  const otherUser = conversation.userAId === currentUser.id ? conversation.userB : conversation.userA;
  const blocked = await isBlockedBetween(currentUser.id, otherUser.id);

  if (blocked) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[980px] space-y-4">
      <RealtimeRefresh topics={[`user:${currentUser.id}`, `conversation:${conversation.id}`]} fallbackIntervalMs={2500} />

      <section className="chat-shell app-card overflow-hidden">
        <div className="chat-header border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/messages"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-white/80 text-slate-600 hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <UserAvatar user={otherUser} className="h-12 w-12 shrink-0 bg-neutral-100 sm:h-14 sm:w-14" textClassName="text-base" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">@{otherUser.username ?? "usuario"}</h1>
                  {isPubliclyVerified(otherUser) ? <VerifiedBadge tone={getVerificationTone(otherUser)} /> : null}
                </div>
                <p className="truncate text-sm text-slate-500">{otherUser.name ?? "Usuario"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="app-pill border-white/40 bg-white/75 text-slate-600 backdrop-blur">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Privado
              </span>
              <span className="app-pill border-white/40 bg-white/75 text-slate-600 backdrop-blur">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Activo
              </span>
            </div>
          </div>
        </div>
        <DirectConversationClient
          conversationId={conversation.id}
          currentUserId={currentUser.id}
          currentUserRole={currentUser.role}
          otherUserLabel={otherUser.username ?? "La otra persona"}
          initialMessages={conversation.messages}
        />
      </section>
    </div>
  );
}
