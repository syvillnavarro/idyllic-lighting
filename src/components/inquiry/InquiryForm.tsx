"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { copy, requestTypes, serviceOptions, timezone, type RequestType } from "@/config/public";
import { selectRequest, useRequestSelection } from "./request-store";

const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 10;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DESCRIPTION_MAX = 1200;

const propertyTypes = ["House", "Townhouse or duplex", "Business or commercial", "Event venue", "Not sure yet"];
const timeframes = [
  "As soon as possible",
  "Within the next month",
  "In 1–3 months",
  "For a specific date or event",
  "Just planning ahead",
];
const contactMethods = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone call" },
  { id: "text", label: "Text message" },
];
const visitWindows = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "flexible", label: "Flexible" },
];

type Fields = {
  name: string;
  email: string;
  phone: string;
  contactMethod: string;
  propertyType: string;
  location: string;
  address: string;
  description: string;
  timeframe: string;
  visitDate: string;
  dateFlexible: boolean;
  visitWindow: string;
  website: string;
};

const EMPTY: Fields = {
  name: "",
  email: "",
  phone: "",
  contactMethod: "",
  propertyType: "",
  location: "",
  address: "",
  description: "",
  timeframe: "",
  visitDate: "",
  dateFlexible: false,
  visitWindow: "",
  website: "",
};

/** In the order they appear, so the summary matches the page. */
const ERROR_ORDER = [
  "name",
  "contact",
  "email",
  "phone",
  "contactMethod",
  "service",
  "propertyType",
  "location",
  "address",
  "description",
  "visitDate",
  "visitWindow",
] as const;

type ErrorKey = (typeof ERROR_ORDER)[number];
type Errors = Partial<Record<ErrorKey, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const validPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
};

const todayInEdmonton = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
const noSubscription = () => () => {};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );

function validate(type: RequestType, service: string, f: Fields, today: string): Errors {
  const errors: Errors = {};
  const email = f.email.trim();
  const phone = f.phone.trim();
  if (f.name.trim().length < 2) errors.name = "Enter your name.";
  if (!email && !phone) errors.contact = "Add an email address or a phone number so Idyllic Lighting can reply.";
  if (email && !EMAIL.test(email)) errors.email = "Enter an email address like name@example.com.";
  if (phone && !validPhone(phone)) errors.phone = "Enter a 10-digit phone number, like 780 555 0123.";
  if (!f.contactMethod) errors.contactMethod = "Choose how you would like to be contacted.";
  else if (f.contactMethod === "email" && !email && !errors.contact)
    errors.contactMethod = "Add your email address, or choose a phone call or text.";
  else if (f.contactMethod !== "email" && !phone && !errors.contact)
    errors.contactMethod = "Add your phone number, or choose email.";
  if (!service) errors.service = "Choose a service, or “Not sure yet”.";
  if (!f.propertyType) errors.propertyType = "Choose a property type, or “Not sure yet”.";
  if (f.location.trim().length < 2) errors.location = "Enter your city or postal code.";
  if (type === "site_visit" && f.address.trim().length < 5) errors.address = "Enter the street address for the visit.";
  if (f.description.trim().length < 10) errors.description = "Add a sentence or two about the project.";
  if (type === "site_visit") {
    if (!f.dateFlexible && !f.visitDate) errors.visitDate = "Choose a preferred date, or tick “My date is flexible”.";
    else if (!f.dateFlexible && today && f.visitDate < today) errors.visitDate = "Choose today or a later date.";
    if (!f.visitWindow) errors.visitWindow = "Choose a time of day, or Flexible.";
  }
  return errors;
}

type Photo = { key: string; name: string; size: number };
type Status = "editing" | "sending" | "done";

export function InquiryForm({ labelledBy }: { labelledBy: string }) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const { type, service } = useRequestSelection();
  const today = useSyncExternalStore(noSubscription, todayInEdmonton, () => "");
  // Until hydration a click would fall back to a native GET, putting the visitor's details in the URL.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failedSubmits, setFailedSubmits] = useState(0);
  const [status, setStatus] = useState<Status>("editing");
  const attempted = failedSubmits > 0;

  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const reopened = useRef(false);
  const sending = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (status === "done") {
      doneRef.current?.focus();
    } else if (status === "editing" && reopened.current) {
      reopened.current = false;
      formRef.current?.querySelector<HTMLInputElement>(".type-switch input:checked")?.focus();
    }
  }, [status]);

  useEffect(() => {
    if (failedSubmits > 0) summaryRef.current?.focus();
  }, [failedSubmits]);

  const update = (patch: Partial<Fields>, nextType = type, nextService = service) => {
    const next = { ...fields, ...patch };
    setFields(next);
    if (attempted) setErrors(validate(nextType, nextService, next, today));
  };

  const chooseType = (value: RequestType) => {
    selectRequest({ type: value });
    if (attempted) setErrors(validate(value, service, fields, today));
  };

  const chooseService = (value: string) => {
    selectRequest({ service: value });
    if (attempted) setErrors(validate(type, value, fields, today));
  };

  const text = (key: keyof Fields) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    update({ [key]: event.target.value } as Partial<Fields>);

  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    const problems: string[] = [];
    const next = [...photos];
    for (const file of picked) {
      if (!PHOTO_TYPES.includes(file.type)) {
        problems.push(`${file.name} isn't a JPEG, PNG or WebP image.`);
      } else if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        problems.push(`${file.name} is larger than ${MAX_PHOTO_MB} MB.`);
      } else if (next.length >= MAX_PHOTOS) {
        problems.push(`Only ${MAX_PHOTOS} photos can be added.`);
        break;
      } else {
        next.push({ key: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, size: file.size });
      }
    }
    setPhotos(next);
    setPhotoError(problems.join(" "));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending.current) return;
    const found = validate(type, service, fields, today);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFailedSubmits((count) => count + 1);
      return;
    }
    // Demo mode: nothing leaves the browser, whether or not the honeypot was filled.
    sending.current = true;
    setStatus("sending");
    timer.current = window.setTimeout(() => {
      sending.current = false;
      setStatus("done");
    }, 650);
  };

  const reopen = () => {
    reopened.current = true;
    setStatus("editing");
  };

  const startOver = () => {
    setFields(EMPTY);
    setPhotos([]);
    setPhotoError("");
    setErrors({});
    setFailedSubmits(0);
    selectRequest({ service: "" });
    reopen();
  };

  const describedBy = (...keys: string[]) => keys.map(id).join(" ");
  const errorText = (key: ErrorKey) =>
    errors[key] ? (
      <p className="field-error" id={id(`${key}-error`)}>
        {errors[key]}
      </p>
    ) : null;
  const errorProps = (key: ErrorKey, hint?: string) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby":
      [hint ? id(hint) : null, errors[key] ? id(`${key}-error`) : null].filter(Boolean).join(" ") || undefined,
  });

  if (status === "done") {
    const serviceLabel = serviceOptions.find((option) => option.id === service)?.label ?? "";
    return (
      <div className="inquiry-card inquiry-done">
        <p className="demo-badge">Demo</p>
        <h3 ref={doneRef} tabIndex={-1}>
          {copy.inquiry.demoNotice}
        </h3>
        <p>When this form is live, the visitor will see:</p>
        <blockquote>{copy.inquiry.confirmation[type]}</blockquote>
        <dl className="done-summary">
          <div>
            <dt>Request</dt>
            <dd>{copy.inquiry.types[type].label}</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>{serviceLabel}</dd>
          </div>
          <div>
            <dt>Property</dt>
            <dd>
              {fields.propertyType}, {fields.location.trim()}
            </dd>
          </div>
          {type === "site_visit" && (
            <div>
              <dt>Preferred visit</dt>
              <dd>
                {fields.dateFlexible || !fields.visitDate ? "Flexible date" : formatDate(fields.visitDate)},{" "}
                {visitWindows.find((w) => w.id === fields.visitWindow)?.label.toLowerCase()} (not confirmed)
              </dd>
            </div>
          )}
          {photos.length > 0 && (
            <div>
              <dt>Photos</dt>
              <dd>
                {photos.length} selected, not uploaded
              </dd>
            </div>
          )}
        </dl>
        <div className="done-actions">
          <button type="button" className="btn btn-dark" onClick={reopen}>
            Edit this request
          </button>
          <button type="button" className="btn btn-quiet" onClick={startOver}>
            Start a new request
          </button>
        </div>
      </div>
    );
  }

  const orderedErrors = ERROR_ORDER.filter((key) => errors[key]);
  const fieldFor: Record<ErrorKey, string> = {
    name: "name",
    contact: "email",
    email: "email",
    phone: "phone",
    contactMethod: "contactMethod-email",
    service: "service",
    propertyType: "propertyType",
    location: "location",
    address: "address",
    description: "description",
    visitDate: "visitDate",
    visitWindow: "visitWindow-morning",
  };
  const isVisit = type === "site_visit";

  return (
    <form ref={formRef} className="inquiry-card inquiry-form" noValidate onSubmit={submit} aria-labelledby={labelledBy}>
      {attempted && orderedErrors.length > 0 && (
        <div className="error-summary" ref={summaryRef} tabIndex={-1} role="group" aria-labelledby={id("summary-title")}>
          <h3 id={id("summary-title")}>
            {orderedErrors.length === 1 ? "Check 1 answer" : `Check ${orderedErrors.length} answers`}
          </h3>
          <ul>
            {orderedErrors.map((key) => (
              <li key={key}>
                <a
                  href={`#${id(fieldFor[key])}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(id(fieldFor[key]))?.focus();
                  }}
                >
                  {errors[key]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className="type-switch">
        <legend>What would you like to request?</legend>
        <div className="type-options">
          {requestTypes.map((value) => (
            <label key={value} className="type-option">
              <input
                type="radio"
                name={id("type")}
                value={value}
                checked={type === value}
                onChange={() => chooseType(value)}
              />
              <span className="type-text">
                <span className="type-label">{copy.inquiry.types[value].label}</span>
                <span className="type-hint">{copy.inquiry.types[value].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor={id("name")}>Your name</label>
        <input id={id("name")} name="name" autoComplete="name" value={fields.name} onChange={text("name")} maxLength={80} {...errorProps("name")} />
        {errorText("name")}
      </div>

      <fieldset className="field-group" aria-describedby={describedBy("contact-hint", ...(errors.contact ? ["contact-error"] : []))}>
        <legend>How can Idyllic Lighting reach you?</legend>
        <p className="field-hint" id={id("contact-hint")}>
          Add at least one.
        </p>
        {errorText("contact")}
        <div className="field-row">
          <div className="field">
            <label htmlFor={id("email")}>
              Email <span className="optional">(optional if you add a phone)</span>
            </label>
            <input id={id("email")} name="email" type="email" inputMode="email" autoComplete="email" value={fields.email} onChange={text("email")} maxLength={120} {...errorProps(errors.contact && !errors.email ? "contact" : "email")} />
            {errorText("email")}
          </div>
          <div className="field">
            <label htmlFor={id("phone")}>
              Phone <span className="optional">(optional if you add an email)</span>
            </label>
            <input id={id("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel" value={fields.phone} onChange={text("phone")} maxLength={24} {...errorProps(errors.contact && !errors.phone ? "contact" : "phone")} />
            {errorText("phone")}
          </div>
        </div>
        <fieldset className="choice-group" aria-describedby={errors.contactMethod ? id("contactMethod-error") : undefined}>
          <legend>Preferred contact method</legend>
          <div className="choices">
            {contactMethods.map((method) => (
              <label key={method.id} className="choice">
                <input
                  type="radio"
                  id={id(`contactMethod-${method.id}`)}
                  name={id("contactMethod")}
                  value={method.id}
                  checked={fields.contactMethod === method.id}
                  onChange={() => update({ contactMethod: method.id })}
                />
                {method.label}
              </label>
            ))}
          </div>
          {errorText("contactMethod")}
        </fieldset>
      </fieldset>

      <div className="field-row">
        <div className="field">
          <label htmlFor={id("service")}>Service</label>
          <select id={id("service")} name="service" value={service} onChange={(event) => chooseService(event.target.value)} {...errorProps("service")}>
            <option value="">Choose a service</option>
            {serviceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {errorText("service")}
        </div>
        <div className="field">
          <label htmlFor={id("propertyType")}>Property type</label>
          <select id={id("propertyType")} name="propertyType" value={fields.propertyType} onChange={text("propertyType")} {...errorProps("propertyType")}>
            <option value="">Choose a property type</option>
            {propertyTypes.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          {errorText("propertyType")}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={id("location")}>City or postal code</label>
          <input id={id("location")} name="location" autoComplete="address-level2" value={fields.location} onChange={text("location")} maxLength={80} {...errorProps("location")} />
          {errorText("location")}
        </div>
        <div className="field">
          <label htmlFor={id("address")}>
            Street address{" "}
            <span className="optional">{isVisit ? "(needed for a site visit)" : "(optional)"}</span>
          </label>
          <input id={id("address")} name="address" autoComplete="street-address" value={fields.address} onChange={text("address")} maxLength={120} {...errorProps("address")} />
          {errorText("address")}
        </div>
      </div>

      <div className="field">
        <label htmlFor={id("description")}>Tell us about the project</label>
        <p className="field-hint" id={id("description-hint")}>
          Rooflines or areas to light, colours you like, or event details. A few sentences is plenty.
        </p>
        <textarea id={id("description")} name="description" rows={4} value={fields.description} onChange={text("description")} maxLength={DESCRIPTION_MAX} {...errorProps("description", "description-hint")} />
        <p className="field-count" aria-hidden="true">
          {fields.description.length}/{DESCRIPTION_MAX}
        </p>
        {errorText("description")}
      </div>

      <div className="field">
        <label htmlFor={id("timeframe")}>
          Ideal installation timing <span className="optional">(optional)</span>
        </label>
        <select id={id("timeframe")} name="timeframe" value={fields.timeframe} onChange={text("timeframe")}>
          <option value="">No preference</option>
          {timeframes.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      {isVisit && (
        <fieldset className="field-group visit-group">
          <legend>Preferred visit</legend>
          <p className="field-hint" id={id("visit-hint")}>
            Edmonton time. This is a preference, not a booking: Idyllic Lighting will contact you to arrange the visit.
          </p>
          <div className="field-row">
            <div className="field">
              <label htmlFor={id("visitDate")}>
                Date {fields.dateFlexible && <span className="optional">(optional)</span>}
              </label>
              <input id={id("visitDate")} name="visitDate" type="date" min={today || undefined} value={fields.visitDate} onChange={text("visitDate")} {...errorProps("visitDate", "visit-hint")} />
              <label className="choice">
                <input type="checkbox" checked={fields.dateFlexible} onChange={(event) => update({ dateFlexible: event.target.checked })} />
                My date is flexible
              </label>
              {errorText("visitDate")}
            </div>
            <fieldset className="choice-group" aria-describedby={errors.visitWindow ? id("visitWindow-error") : undefined}>
              <legend>Time of day</legend>
              <div className="choices">
                {visitWindows.map((slot) => (
                  <label key={slot.id} className="choice">
                    <input
                      type="radio"
                      id={id(`visitWindow-${slot.id}`)}
                      name={id("visitWindow")}
                      value={slot.id}
                      checked={fields.visitWindow === slot.id}
                      onChange={() => update({ visitWindow: slot.id })}
                    />
                    {slot.label}
                  </label>
                ))}
              </div>
              {errorText("visitWindow")}
            </fieldset>
          </div>
        </fieldset>
      )}

      <div className="field">
        <label htmlFor={id("photos")}>
          Photos of the property <span className="optional">(optional)</span>
        </label>
        <p className="field-hint" id={id("photos-hint")}>
          Up to {MAX_PHOTOS} JPEG, PNG or WebP images, {MAX_PHOTO_MB} MB each. In this demo, photos stay on your device and are not
          uploaded.
        </p>
        <input
          id={id("photos")}
          name="photos"
          type="file"
          accept={PHOTO_TYPES.join(",")}
          multiple
          onChange={addPhotos}
          disabled={photos.length >= MAX_PHOTOS}
          aria-describedby={[id("photos-hint"), photoError ? id("photos-error") : ""].filter(Boolean).join(" ")}
        />
        {photoError && (
          <p className="field-error" id={id("photos-error")}>
            {photoError}
          </p>
        )}
        {photos.length > 0 && (
          <ul className="photo-list">
            {photos.map((photo) => (
              <li key={photo.key}>
                <span>
                  {photo.name} <span className="photo-size">({(photo.size / 1024 / 1024).toFixed(1)} MB)</span>
                </span>
                <button type="button" className="link-button" onClick={() => setPhotos(photos.filter((p) => p.key !== photo.key))}>
                  Remove<span className="sr-only"> {photo.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor={id("website")}>Leave this field empty</label>
        <input id={id("website")} name="website" tabIndex={-1} autoComplete="off" value={fields.website} onChange={text("website")} />
      </div>

      <div className="submit-row">
        <p className="privacy-note">{copy.inquiry.privacy}</p>
        <button
          type="submit"
          className="btn btn-dark btn-submit"
          disabled={!hydrated || status === "sending"}
          aria-describedby={id("demo-note")}
        >
          {status === "sending" ? "Checking…" : isVisit ? "Send site-visit request" : "Send quote request"}
        </button>
        <p className="demo-note" id={id("demo-note")}>
          Demo only: this preview doesn’t send anything to Idyllic Lighting.
        </p>
        <noscript>
          <p className="demo-note">This demo form needs JavaScript. Turn it on to try it.</p>
        </noscript>
      </div>
    </form>
  );
}
