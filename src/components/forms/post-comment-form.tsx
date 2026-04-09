"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/http";
import { createPostCommentAction } from "@/app/actions/social";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {};

export function PostCommentForm({ postId, redirectPath }: { postId: string; redirectPath: string }) {
  const [state, formAction] = useActionState(createPostCommentAction, initialState);

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="redirectPath" value={redirectPath} />
      <div className="flex items-center gap-2">
        <input name="body" className="app-input h-11 flex-1" placeholder="Escribe un comentario..." />
        <SubmitButton className="app-button-secondary whitespace-nowrap disabled:opacity-60" pendingText="Enviando...">
          Comentar
        </SubmitButton>
      </div>
      {state.error ? <p className="mt-2 text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm text-green-600">{state.success}</p> : null}
    </form>
  );
}
