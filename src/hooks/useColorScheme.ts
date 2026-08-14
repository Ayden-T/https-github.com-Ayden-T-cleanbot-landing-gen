"use client";

import { useSyncExternalStore } from "react";
import type { Mode } from "@/lib/palette";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): Mode {
  return window.matchMedia(QUERY).matches ? "dark" : "light";
}

function getServerSnapshot(): Mode {
  return "light";
}

export function useColorScheme(): Mode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
