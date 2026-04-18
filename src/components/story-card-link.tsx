"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type StoryCardLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function StoryCardLink({ href, className, children }: StoryCardLinkProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      onTouchStart={() => router.prefetch(href)}
      className={className}
    >
      {children}
    </Link>
  );
}
