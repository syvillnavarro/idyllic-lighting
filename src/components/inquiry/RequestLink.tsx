"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { RequestType } from "@/config/public";
import { selectRequest } from "./request-store";

export const REQUEST_SECTION_ID = "request";
export const REQUEST_HEADING_ID = "request-title";

type Props = {
  type: RequestType;
  service?: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
};

/**
 * Opens the shared inquiry form with the right request type. On a page that
 * has the form it scrolls there and moves focus to its heading; elsewhere,
 * or without JavaScript, it goes to the dedicated request page.
 */
export function RequestLink({ type, service, className, children, onNavigate }: Props) {
  const query = new URLSearchParams({ type, ...(service ? { service } : {}) });

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.();
    const section = document.getElementById(REQUEST_SECTION_ID);
    if (!section || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectRequest({ type, ...(service ? { service } : {}) });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    document.getElementById(REQUEST_HEADING_ID)?.focus({ preventScroll: true });
  };

  return (
    <Link href={`/request/?${query}`} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
