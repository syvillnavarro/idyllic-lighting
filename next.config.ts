import type { NextConfig } from "next";
import assetManifest from "./content/asset-manifest.json";
import business from "./content/business-draft.json";

const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || undefined;

/**
 * The only draft values client code needs, inlined at build time so the drafts
 * themselves (unapproved services, notes, rights status) never reach the browser.
 * Restart the dev server after editing the content JSON.
 */
const publicConfig = {
  timezone: business.forms.timezone,
  services: business.proposedServices.map(({ id, label }) => ({ id, label })),
  motion: business.motion,
  hasApprovedWork: assetManifest.assets.some((asset) => asset.kind === "portfolio" && asset.productionApproved),
};

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  env: { IDYLLIC_PUBLIC_CONFIG: JSON.stringify(publicConfig) },
};

export default nextConfig;
