"use client";

import { useQuery } from "@tanstack/react-query";

import { listFieldActions } from "@/lib/arsenal/api";

import { qk } from "./query-keys";

export function useFieldActions() {
  return useQuery({
    queryKey: qk.fieldActions(),
    queryFn: () => listFieldActions(),
  });
}
