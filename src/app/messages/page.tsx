import Link from "next/link";
import { MessageCircleMore, Search } from "lucide-react";
import { requireAuth } from "@/lib/permissions";
import { db } from "@/lib/db";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getBlockedUserIds } from "@/lib/privacy";
import { PaginationControls } from "@/components/pagination-controls";

type SearchParams = Promise<{ page?: string }>;

const CONVERSATIONS_PER_PAGE = 15;

function parsePage(value?: string) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const currentUser = await requireAuth();
  const params = await searchParams;
  const page = parsePage(params.page);
  const blockedUserIds = await getBlockedUserIds(currentUser.id);

  const where = {
    OR: [{ userAId: currentUser.id }, { userBId: currentUser.id }],
    ...(blockedUserIds.length
      ? {
          NOT: [{ userAId: { in: blockedUserIds } }, { userBId: { in: blockedUserIds } }],
        }
      : {}),
  };

  const [conversationCount, conversations] = await Promise.all([
    db.directConversation.count({ where }),
    db.directConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * CONVERSATIONS_PER_PAGE,
      take: CONVERSATIONS_PER_PAGE,
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
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                hiddenAt: null,
                senderId: { not: currentUser.id },
                readAt: null,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(conversationCount / CONVERSATIONS_PER_PAGE));

  return (
    <div className="mx-auto max-w-[980px] space-y-4">
      <RealtimeRefresh topics={[`user:${currentUser.id}`]} fallbackIntervalMs={10000} />

      <section className="app-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Mensajes privados</p>
            <p className="text-xs text-slate-500">
              {conversationCount} conversaciones · {conversations.reduce((total, conversation) => total + conversation._count.messages, 0)} mensajes sin leer
            </p>
          </div>
        </div>

        <div className="divide-y divide-neutral-200">
          {conversations.map((conversation) => {
            const otherUser = conversation.userAId === currentUser.id ? conversation.userB : conversation.userA;
            const lastMessage = conversation.messages[0];
            const unreadCount = conversation._count.messages;

            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="chat-list-item flex items-center gap-3 px-4 py-4 sm:px-5"
              >
                <div className="relative shrink-0">
                  <UserAvatar user={otherUser} className="h-14 w-14 bg-neutral-100 sm:h-16 sm:w-16" textClassName="text-base sm:text-lg" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[11px] font-semibold text-white shadow-lg">
                      {unreadCount}
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-950 sm:text-[15px]">@{otherUser.username ?? "usuario"}</p>
                    {isPubliclyVerified(otherUser) ? <VerifiedBadge tone={getVerificationTone(otherUser)} /> : null}
                  </div>
                  {otherUser.name ? <p className="truncate text-sm text-slate-500">{otherUser.name}</p> : null}
                  <p className={`mt-1 truncate text-sm ${unreadCount > 0 ? "font-semibold text-slate-700" : "text-slate-400"}`}>
                    {lastMessage?.body ?? "Todavía no hay mensajes."}
                  </p>
                </div>

                <div className="hidden text-right sm:block">
                  <p className="text-xs text-slate-400">
                    {lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
              </Link>
            );
          })}

          {conversations.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-neutral-100 text-slate-500">
                <MessageCircleMore className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">Tu bandeja está vacía</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Entra en un perfil y pulsa en Mensaje para abrir una conversación privada.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <PaginationControls pathname="/messages" currentPage={page} totalPages={totalPages} />
    </div>
  );
}
