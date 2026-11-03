import type business from "@content/business-draft.json";
import copy from "@content/site-copy.json";

export { copy };

type PublicConfig = {
  timezone: string;
  services: { id: string; label: string }[];
  motion: (typeof business)["motion"];
  hasApprovedWork: boolean;
};

const raw = process.env.IDYLLIC_PUBLIC_CONFIG;
if (!raw) throw new Error("IDYLLIC_PUBLIC_CONFIG is missing; next.config.ts defines it.");
const config: PublicConfig = JSON.parse(raw);

export const { timezone, motion } = config;

export type RequestType = "quote" | "site_visit";

export const requestTypes: RequestType[] = ["quote", "site_visit"];

export const isRequestType = (value: unknown): value is RequestType =>
  value === "quote" || value === "site_visit";

export const actionLabel: Record<RequestType, string> = {
  quote: copy.actions.quote,
  site_visit: copy.actions.siteVisit,
};

export const serviceOptions = [...config.services, { id: "not-sure", label: "Not sure yet" }];

/** Sections appear in the navigation once they exist on the page. */
export const navItems = [
  { label: "Services", href: "/#services", built: false },
  { label: "Our Work", href: "/#work", built: config.hasApprovedWork },
  { label: "How It Works", href: "/#how-it-works", built: false },
  { label: "Contact", href: "/#request", built: true },
].filter((item) => item.built);
