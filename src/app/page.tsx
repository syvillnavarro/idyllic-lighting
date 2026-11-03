import { Hero } from "@/components/hero/Hero";
import { InquirySection } from "@/components/inquiry/InquirySection";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { copy } from "@/config/site";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Hero />
        <div id="after-hero" className="after-hero" tabIndex={-1} />
        <InquirySection title={copy.inquiry.title} />
      </main>
      <SiteFooter />
    </>
  );
}
