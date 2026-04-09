"use client";

import { useActionState, useState } from "react";
import { deletePostAction, updatePostAction } from "@/app/actions/social";
import type { ActionState } from "@/lib/http";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function PostActions({
  postId,
  initialContent,
  redirectPath,
  canDelete,
}: {
  postId: string;
  initialContent: string;
  redirectPath: string;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updatePostAction, initialState);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className="text-xs font-medium text-slate-500" onClick={() => setOpen((value) => !value)}>
        {open ? "Cerrar edición" : "Editar"}
      </button>

      {canDelete ? (
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="redirectPath" value={redirectPath} />
          <button type="submit" className="text-xs font-medium text-red-500">
            Borrar
          </button>
        </form>
      ) : null}

      {open ? (
        <form action={formAction} className="mt-2 w-full space-y-2">
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="redirectPath" value={redirectPath} />
          <textarea name="content" defaultValue={initialContent} className="app-textarea min-h-24" />
          <SubmitButton className="app-button-secondary" pendingText="Guardando...">
            Guardar cambios
          </SubmitButton>
          {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
