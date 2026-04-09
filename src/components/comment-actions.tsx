"use client";

import { useActionState, useState } from "react";
import {
  deletePostCommentAction,
  toggleCommentLikeAction,
  updatePostCommentAction,
} from "@/app/actions/social";
import type { ActionState } from "@/lib/http";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function CommentActions({
  commentId,
  initialBody,
  redirectPath,
  liked,
  likeCount,
  canDelete,
  canEdit,
}: {
  commentId: string;
  initialBody: string;
  redirectPath: string;
  liked: boolean;
  likeCount: number;
  canDelete: boolean;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updatePostCommentAction, initialState);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <form action={toggleCommentLikeAction}>
        <input type="hidden" name="commentId" value={commentId} />
        <input type="hidden" name="redirectPath" value={redirectPath} />
        <button type="submit" className={`text-xs font-medium ${liked ? "text-rose-500" : "text-slate-500"}`}>
          {liked ? "Te gusta" : "Me gusta"} · {likeCount}
        </button>
      </form>

      {canEdit ? (
        <button type="button" className="text-xs font-medium text-slate-500" onClick={() => setOpen((value) => !value)}>
          {open ? "Cerrar" : "Editar"}
        </button>
      ) : null}

      {canDelete ? (
        <form action={deletePostCommentAction}>
          <input type="hidden" name="commentId" value={commentId} />
          <input type="hidden" name="redirectPath" value={redirectPath} />
          <button type="submit" className="text-xs font-medium text-red-500">
            Borrar
          </button>
        </form>
      ) : null}

      {open ? (
        <form action={formAction} className="w-full space-y-2">
          <input type="hidden" name="commentId" value={commentId} />
          <input type="hidden" name="redirectPath" value={redirectPath} />
          <textarea name="body" defaultValue={initialBody} className="app-textarea min-h-20" />
          <SubmitButton className="app-button-secondary" pendingText="Guardando...">
            Guardar comentario
          </SubmitButton>
          {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
