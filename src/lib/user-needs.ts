"use client";

/**
 * User Needs — simple cards captured in the User Needs phase. Each card is a
 * need statement plus free-form notes and an Improve / Maintain tag (only
 * Improve needs flow into Feature Development). Kept per browser.
 */
import { useCallback, useEffect, useState } from "react";
import { makeId, nowISO } from "./types";

export type NeedKind = "improve" | "maintain";

export const NEED_KINDS: Record<NeedKind, { label: string; className: string }> = {
  improve: { label: "Improve", className: "bg-[#08A9AD]/15 text-[#0a7f82] border-[#08A9AD]/40" },
  maintain: { label: "Maintain", className: "bg-neutral-200 text-neutral-700 border-neutral-300" },
};

export interface UserNeedCard {
  id: string;
  title: string;
  note: string;
  kind: NeedKind;
  createdAt: string;
}

const card = (title: string, note: string, kind: NeedKind): UserNeedCard => ({ id: makeId("un"), title, note, kind, createdAt: nowISO() });

export function seedUserNeeds(): UserNeedCard[] {
  return [
    card(
      "Reduce catheter-related bloodstream infections in long-dwell peripheral IVs",
      "Nursing interviews (n=12): infections cluster after 72 h dwell. Current practice is routine replacement, which patients dislike.",
      "improve"
    ),
    card(
      "Improve first-attempt cannulation in difficult venous access",
      "DIVA patients average 2.4 sticks. Clinicians want to see vessel depth before puncture.",
      "improve"
    ),
    card("Keep the insertion workflow under 90 seconds", "Any added step must not slow the existing kit. Maintain, not improve.", "maintain"),
  ];
}

export function newUserNeed(): UserNeedCard {
  return card("", "", "improve");
}

const KEY = "mosaic-user-needs-v1";

export function useUserNeeds() {
  const [cards, setCards] = useState<UserNeedCard[]>(() => {
    if (typeof window === "undefined") return seedUserNeeds();
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as UserNeedCard[];
    } catch {
      /* ignore */
    }
    return seedUserNeeds();
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cards));
    } catch {
      /* ignore */
    }
  }, [cards]);
  const reset = useCallback(() => setCards(seedUserNeeds()), []);
  return [cards, setCards, reset] as const;
}
