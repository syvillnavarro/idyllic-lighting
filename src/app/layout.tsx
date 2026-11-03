import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Idyllic Lighting | Concept preview",
    template: "%s | Idyllic Lighting concept preview",
  },
  description:
    "Concept preview of a website for Idyllic Lighting: permanent and seasonal outdoor lighting for homes and businesses in Leduc, Edmonton and Central Alberta.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0B0E13",
};

/**
 * Opt into the animated hero layout before first paint. If the app bundle never
 * claims the hero (blocked or failed scripts), fall back to the static layout.
 */
const enhanceScript = `(function(d){var r=d.documentElement;r.classList.replace("no-js","js");addEventListener("load",function(){setTimeout(function(){var h=d.querySelector(".hero");if(h&&h.getAttribute("data-mode")==="pending")r.classList.replace("js","no-js")},3000)})})(document)`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" className={`no-js ${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: enhanceScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
