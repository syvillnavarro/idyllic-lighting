import { business, copy, serviceAreaText } from "@/config/site";
import { InquiryForm } from "./InquiryForm";
import { REQUEST_HEADING_ID, REQUEST_SECTION_ID } from "./RequestLink";

const { email, facebook } = business.publishedReferences;

export function InquirySection({ as: Heading = "h2", title }: { as?: "h1" | "h2"; title: string }) {
  return (
    <section id={REQUEST_SECTION_ID} className="inquiry" aria-labelledby={REQUEST_HEADING_ID}>
      <div className="inquiry-inner">
        <div className="inquiry-intro">
          <p className="eyebrow">Quotes &amp; site visits</p>
          <Heading id={REQUEST_HEADING_ID} tabIndex={-1}>
            {title}
          </Heading>
          <p className="inquiry-lede">{copy.inquiry.intro}</p>
          <dl className="inquiry-facts">
            <div>
              <dt>Service area</dt>
              <dd>{serviceAreaText}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${email}`}>{email}</a>
              </dd>
            </div>
            <div>
              <dt>Facebook</dt>
              <dd>
                <a href={facebook} target="_blank" rel="noopener noreferrer">
                  Idyllic Lighting on Facebook
                </a>
              </dd>
            </div>
          </dl>
          <p className="inquiry-demo">
            <strong>{copy.preview.label}.</strong> This form shows how requests will work. It doesn’t send anything to
            Idyllic Lighting.
          </p>
        </div>
        <InquiryForm labelledBy={REQUEST_HEADING_ID} />
      </div>
    </section>
  );
}
