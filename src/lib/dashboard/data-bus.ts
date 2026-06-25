"use client";

import { useSyncExternalStore } from "react";

export type DashboardResource = "weekly-actions";

const versions: Map<DashboardResource, number> = new Map();
const listeners: Map<DashboardResource, Set<() => void>> = new Map();

export function bumpResource(resource: DashboardResource): void {
  versions.set(resource, (versions.get(resource) ?? 0) + 1);
  const set = listeners.get(resource);
  if (!set || set.size === 0) return;
  for (const fn of Array.from(set)) {
    try {
      fn();
    } catch {
      // Um listener com erro não pode quebrar os demais.
    }
  }
}

export function getResourceVersion(resource: DashboardResource): number {
  return versions.get(resource) ?? 0;
}

function subscribe(resource: DashboardResource, fn: () => void): () => void {
  let set = listeners.get(resource);
  if (!set) {
    set = new Set();
    listeners.set(resource, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
  };
}

export function useResourceVersion(resource: DashboardResource): number {
  return useSyncExternalStore(
    (cb) => subscribe(resource, cb),
    () => getResourceVersion(resource),
    () => 0,
  );
}
