import { deleteDirectMessageAction, deleteEventChatMessageAction, deleteGroupMessageAction } from "@/app/actions/social";

export function MessageActions({
  kind,
  id,
  mine = false,
}: {
  kind: "direct" | "group" | "event";
  id: string;
  mine?: boolean;
}) {
  const action =
    kind === "direct" ? deleteDirectMessageAction : kind === "event" ? deleteEventChatMessageAction : deleteGroupMessageAction;
  const fieldName = "messageId";

  return (
    <form action={action}>
      <input type="hidden" name={fieldName} value={id} />
      <button type="submit" className={`mt-2 text-[11px] font-medium ${mine ? "text-white/75 hover:text-white" : "text-slate-500 hover:text-slate-700"}`}>
        Borrar
      </button>
    </form>
  );
}
