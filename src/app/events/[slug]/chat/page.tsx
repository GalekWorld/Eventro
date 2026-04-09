import Link from "next/link";
import { notFound } from "next/navigation";
import { markEventChatReadAction } from "@/app/actions/social";
import { EventChatForm } from "@/components/forms/event-chat-form";
import { MessageActions } from "@/components/message-actions";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TypingIndicator } from "@/components/typing-indicator";
import { getEventChatBySlugForUser } from "@/features/events/event.service";
import { requireAuth } from "@/lib/permissions";

export default async function EventChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const currentUser = await requireAuth();
  const chat = await getEventChatBySlugForUser({
    slug,
    userId: currentUser.id,
    role: currentUser.role,
  });

  if (!chat) notFound();
  await markEventChatReadAction(chat.id);

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <RealtimeRefresh topics={[`user:${currentUser.id}`, `event:${chat.id}`]} fallbackIntervalMs={8000} />

      <section className="app-card overflow-hidden rounded-[18px]">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">Chat del evento</h1>
              <p className="mt-1 truncate text-sm text-slate-500">
                {chat.title} · {chat._count.chatParticipants} personas dentro
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {chat.isChatOpen
                  ? "Este chat estará abierto hasta unas horas después del evento."
                  : "Este chat temporal ya ha terminado y queda solo en modo lectura."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/events/${chat.slug ?? chat.id}`} className="app-button-secondary shrink-0">
                Ver evento
              </Link>
              <Link href="/tickets" className="app-button-secondary shrink-0">
                Mis entradas
              </Link>
            </div>
          </div>
        </div>

        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-slate-500 sm:px-5">
          Usa este chat para coordinarte antes del evento. Mantén el buen ambiente y evita spam o contenido ofensivo.
        </div>

        <div className="max-h-[58svh] space-y-3 overflow-y-auto px-3 py-4 sm:max-h-[62vh] sm:px-4">
          {chat.chatMessages.map((message) => {
            const mine = message.author.id === currentUser.id;
            const canDelete = mine || chat.ownerId === currentUser.id || currentUser.role === "ADMIN";

            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-[20px] px-4 py-3 sm:max-w-[82%] ${
                    mine ? "bg-sky-500 text-white" : "bg-neutral-100 text-slate-900"
                  }`}
                >
                  <p className={`text-xs font-semibold ${mine ? "text-white/90" : "text-slate-500"}`}>
                    @{message.author.username ?? "usuario"}
                    {message.author.isVerified ? " · verificado" : ""}
                  </p>
                  <p className={`mt-1 break-words text-sm leading-6 ${mine ? "text-white" : "text-slate-800"}`}>{message.body}</p>
                  {canDelete ? <MessageActions kind="event" id={message.id} /> : null}
                </div>
              </div>
            );
          })}

          {chat.chatMessages.length === 0 ? (
            <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-slate-500">
              Aún no hay mensajes. Rompe el hielo con la gente que va a ir.
            </div>
          ) : null}
        </div>

        <TypingIndicator topic={`event:${chat.id}`} actorId={currentUser.id} label="Alguien" />
        {chat.isChatOpen ? (
          <EventChatForm eventId={chat.id} />
        ) : (
          <div className="border-t border-neutral-200 p-4 text-sm text-slate-500">El chat temporal ya está cerrado.</div>
        )}
      </section>
    </div>
  );
}
