import Image from "next/image";
import logo from "@/assets/brand/idyllic-logo.webp";
import { RequestLink } from "@/components/inquiry/RequestLink";
import { actionLabel, business, copy, serviceAreaText } from "@/config/site";

const { email, facebook } = business.publishedReferences;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Image src={logo} alt="Idyllic Lighting" loading="lazy" />
        </div>
        <div className="footer-col">
          <h2>Contact</h2>
          <ul>
            <li>
              <a href={`mailto:${email}`}>{email}</a>
            </li>
            <li>
              <a href={facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h2>Service area</h2>
          <p>{serviceAreaText}</p>
        </div>
        <div className="footer-col">
          <h2>Get started</h2>
          <ul>
            <li>
              <RequestLink type="quote">{actionLabel.quote}</RequestLink>
            </li>
            <li>
              <RequestLink type="site_visit">{actionLabel.site_visit}</RequestLink>
            </li>
          </ul>
        </div>
      </div>
      <p className="footer-note">
        <strong>{copy.preview.label}.</strong> {copy.preview.detail} Contact details and service area are from public
        listings and still need the owner’s confirmation.
      </p>
    </footer>
  );
}
