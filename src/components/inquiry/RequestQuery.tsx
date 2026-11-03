"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { isRequestType, serviceOptions } from "@/config/public";
import { REQUEST_HEADING_ID } from "./RequestLink";
import { selectRequest } from "./request-store";

/** Applies `?type=` and `?service=` from a direct link, then moves focus to the form heading. */
export function RequestQuery() {
  const params = useSearchParams();

  useEffect(() => {
    const type = params.get("type");
    const service = params.get("service");
    selectRequest({
      ...(isRequestType(type) ? { type } : {}),
      ...(service && serviceOptions.some((option) => option.id === service) ? { service } : {}),
    });
  }, [params]);

  useEffect(() => {
    document.getElementById(REQUEST_HEADING_ID)?.focus({ preventScroll: true });
  }, []);

  return null;
}
