"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import wordmark from "@/assets/brand/idyllic-wordmark.webp";
import { RequestLink } from "@/components/inquiry/RequestLink";
import { actionLabel, copy, navItems } from "@/config/public";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header ref={headerRef} className="site-header">
      <p className="concept-bar">
        <span className="concept-full">
          <strong>{copy.preview.label}.</strong> {copy.preview.detail}
        </span>
        <span className="concept-short">{copy.preview.short}</span>
      </p>
      <div className="nav-bar">
        <Link href="/" className="brand">
          <Image src={wordmark} alt="Idyllic Lighting" preload />
        </Link>
        <nav aria-label="Main" className="nav-links">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <RequestLink type="quote" className="btn btn-gold btn-compact header-cta">
          {actionLabel.quote}
        </RequestLink>
        <button
          ref={buttonRef}
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="menu-icon" aria-hidden="true" />
          <span>Menu</span>
        </button>
      </div>
      <div id={menuId} className="menu-panel" hidden={!open}>
        <ul>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={close}>
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <RequestLink type="site_visit" onNavigate={close}>
              {actionLabel.site_visit}
            </RequestLink>
          </li>
        </ul>
      </div>
    </header>
  );
}
