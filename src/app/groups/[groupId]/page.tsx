import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { GroupChatForm } from "@/components/forms/group-chat-form";
import { MessageActions } from "@/components/message-actions";
import { GroupInviteForm } from "@/components/forms/group-invite-form";
import { reviewGroupJoinRequestAction, markGroupReadAction } from "@/app/actions/social";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TypingIndicator } from "@/components/typing-indicator";

export default async function GroupChatPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const currentUser = await requireAuth();

  await markGroupReadAction(groupId);

  const membership = await db.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: currentUser.id,
      },
    },
    include: {
      group: {
        include: {
          owner: {
            select: {
              username: true,
            },
          },
          _count: {
            select: { memberships: true },
          },
          joinRequests: {
            where: { status: "PENDING" },
            include: {
              user: {
                select: { id: true, username: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) notFound();

  const messages = await db.groupMessage.findMany({
    where: { groupId, hiddenAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          isVerified: true,
        },
      },
    },
  });

  const isOwner = membership.role === "OWNER";

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <RealtimeRefresh topics={[`user:${currentUser.id}`, `group:${groupId}`]} fallbackIntervalMs={8000} />

      <section className="app-card overflow-hidden rounded-[18px]">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">{membership.group.name}</h1>
              <p className="mt-1 truncate text-sm text-slate-500">
                @{membership.group.owner.username ?? "owner"} · {membership.group._count.memberships} miembros
              </p>
            </div>
            <Link href="/groups" className="app-button-secondary shrink-0">
              Volver
            </Link>
          </div>
        </div>

        {isOwner ? (
          <div className="grid gap-4 border-b border-neutral-200 p-4 md:grid-cols-2">
            <GroupInviteForm groupId={groupId} />

            <div className="rounded-3xl bg-neutral-50 p-4">
              <h2 className="text-sm font-semibold text-slate-950">Solicitudes pendientes</h2>
              <div className="mt-3 space-y-3">
                {membership.group.joinRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl bg-white p-3">
                    <p className="text-sm font-semibold text-slate-950">@{request.user.username ?? "usuario"}</p>
                    <p className="mt-1 text-xs text-slate-500">{request.user.name ?? "Usuario"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={reviewGroupJoinRequestAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button className="app-button-primary" type="submit">
                          Aceptar
                        </button>
                      </form>
                      <form action={reviewGroupJoinRequestAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <button className="app-button-secondary" type="submit">
                          Rechazar
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
                {membership.group.joinRequests.length === 0 ? <p className="text-sm text-slate-500">No hay solicitudes pendientes.</p> : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-3 px-3 py-4 sm:px-4">
          {messages.map((message) => {
            const mine = message.author.id === currentUser.id;
            const canDelete = mine || isOwner || currentUser.role === "ADMIN";

            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-[20px] px-4 py-3 sm:max-w-[82%] ${mine ? "bg-sky-500 text-white" : "bg-neutral-100 text-slate-900"}`}>
                  <p className={`text-xs font-semibold ${mine ? "text-white/90" : "text-slate-500"}`}>
                    @{message.author.username ?? "usuario"}
                    {message.author.isVerified ? " · verificado" : ""}
                  </p>
                  <p className={`mt-1 break-words text-sm leading-6 ${mine ? "text-white" : "text-slate-800"}`}>{message.body}</p>
                  {canDelete ? <MessageActions kind="group" id={message.id} /> : null}
                </div>
              </div>
            );
          })}

          {messages.length === 0 ? <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-slate-500">Aún no hay mensajes en este grupo.</div> : null}
        </div>

        <TypingIndicator topic={`group:${groupId}`} actorId={currentUser.id} label="Alguien" />
        <GroupChatForm groupId={groupId} />
      </section>
    </div>
  );
}

