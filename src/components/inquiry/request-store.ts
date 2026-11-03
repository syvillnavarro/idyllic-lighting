import { useSyncExternalStore } from "react";
import type { RequestType } from "@/config/public";

export type RequestSelection = { type: RequestType; service: string };

let selection: RequestSelection = { type: "quote", service: "" };
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSelection = () => selection;

/** Changing the type or service keeps everything else the visitor has typed. */
export function selectRequest(update: Partial<RequestSelection>) {
  selection = { ...selection, ...update };
  listeners.forEach((listener) => listener());
}

export function useRequestSelection() {
  return useSyncExternalStore(subscribe, getSelection, getSelection);
}
