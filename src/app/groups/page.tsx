import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { GroupForm } from "@/components/forms/group-form";
import { respondGroupInviteAction, toggleGroupMembershipAction } from "@/app/actions/social";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export default async function GroupsPage() {
  const currentUser = await getCurrentUser();
  const groups = await db.group.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: currentUser
        ? {
            where: { userId: currentUser.id },
            select: {
              id: true,
              lastReadAt: true,
            },
          }
        : false,
      joinRequests: currentUser ? { where: { userId: currentUser.id, status: "PENDING" } } : false,
      invites: currentUser ? { where: { invitedUserId: currentUser.id, acceptedAt: null, rejectedAt: null } } : false,
      messages: currentUser
        ? {
            where: { hiddenAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              createdAt: true,
            },
          }
        : false,
      _count: {
        select: { memberships: true, messages: { where: { hiddenAt: null } } },
      },
      owner: {
        select: {
          username: true,
          name: true,
          isVerified: true,
          role: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      {currentUser ? <RealtimeRefresh topics={[`user:${currentUser.id}`]} fallbackIntervalMs={12000} /> : null}

      <section className="app-card p-5">
        <h1 className="app-screen-title">Grupos</h1>
        <p className="mt-2 app-screen-subtitle">Unete a grupos y habla con gente que comparte tus intereses.</p>
      </section>

      {currentUser ? <GroupForm /> : null}

      <section className="grid gap-4">
        {groups.map((group) => {
          const joined = Array.isArray(group.memberships) && group.memberships.length > 0;
          const pending = Array.isArray(group.joinRequests) && group.joinRequests.length > 0;
          const invite = Array.isArray(group.invites) ? group.invites[0] : null;
          const membership = Array.isArray(group.memberships) ? group.memberships[0] : null;
          const latestMessage = Array.isArray(group.messages) ? group.messages[0] : null;
          const hasUnread =
            joined &&
            latestMessage &&
            (!membership?.lastReadAt || new Date(latestMessage.createdAt) > new Date(membership.lastReadAt));

          return (
            <article key={group.id} className="app-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-950">{group.name}</h2>
                    <span className="app-pill">{group.privacy}</span>
                    {isPubliclyVerified(group.owner) ? (
                      <span className="app-pill">
                        <VerifiedBadge tone={getVerificationTone(group.owner)} /> verificado
                      </span>
                    ) : null}
                    {hasUnread ? <span className="app-pill bg-sky-100 text-sky-700">Nuevos</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Creado por @{group.owner.username ?? "owner"} · {group._count.memberships} miembros · {group._count.messages} mensajes
                  </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{group.description ?? "Este grupo todavía no tiene descripción."}</p>
                </div>

                {currentUser ? (
                  <div className="flex flex-wrap gap-2">
                    {invite ? (
                      <>
                        <form action={respondGroupInviteAction}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <input type="hidden" name="decision" value="accept" />
                          <button className="app-button-primary" type="submit">
                            Aceptar invitacion
                          </button>
                        </form>
                        <form action={respondGroupInviteAction}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <input type="hidden" name="decision" value="reject" />
                          <button className="app-button-secondary" type="submit">
                            Rechazar
                          </button>
                        </form>
                      </>
                    ) : (
                      <form action={toggleGroupMembershipAction}>
                        <input type="hidden" name="groupId" value={group.id} />
                        <button className={joined ? "app-button-secondary" : "app-button-primary"} type="submit">
                          {joined ? "Salir" : pending ? "Solicitud enviada" : group.privacy === "PRIVATE" ? "Solicitar acceso" : "Unirme"}
                        </button>
                      </form>
                    )}
                    {joined ? (
                      <Link href={`/groups/${group.id}`} className="app-button-secondary">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Chat
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}

        {groups.length === 0 ? <div className="app-card p-5 text-sm text-slate-500">Todavía no hay grupos creados.</div> : null}
      </section>
    </div>
  );
}
