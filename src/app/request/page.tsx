import type { Metadata } from "next";
import { Suspense } from "react";
import { InquirySection } from "@/components/inquiry/InquirySection";
import { RequestQuery } from "@/components/inquiry/RequestQuery";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { copy } from "@/config/site";

export const metadata: Metadata = {
  title: copy.inquiry.pageTitle,
};

export default function RequestPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="request-page">
        <Suspense fallback={null}>
          <RequestQuery />
        </Suspense>
        <InquirySection as="h1" title={copy.inquiry.pageTitle} />
      </main>
      <SiteFooter />
    </>
  );
}
