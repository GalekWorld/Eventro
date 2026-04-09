"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  className,
  disabled = false,
  ariaLabel,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  const content = pending ? pendingText || children : children;

  return (
    <button className={className} type="submit" disabled={pending || disabled} aria-label={ariaLabel}>
      {content}
    </button>
  );
}
