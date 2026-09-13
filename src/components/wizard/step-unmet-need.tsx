"use client";

import { Lightbulb } from "lucide-react";
import type { MechanismOfAction } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Edit } from "./wizard";

export function StepUnmetNeed({ moa, edit }: { moa: MechanismOfAction; edit: Edit }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#00224B]">What unmet need does this mechanism improve?</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Write it the way a clinician would describe the problem at the bedside. Be specific about the population,
          the setting, and the outcome you want to move.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="un">Unmet Need (UN)</Label>
        <Textarea
          id="un"
          rows={5}
          value={moa.unmetNeed}
          onChange={(e) => edit((m) => ({ ...m, unmetNeed: e.target.value }), "Unmet need edited")}
          placeholder="e.g. Reduce catheter-related bloodstream infections in peripheral IV placements dwelling > 72 h."
          className="text-base"
          autoFocus
        />
        <div className="text-xs text-neutral-500">{moa.unmetNeed.trim().length} characters</div>
      </div>

      <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <Lightbulb className="mt-0.5 size-4 shrink-0" />
        <div>
          <div className="font-medium">Only improve UNs — do not maintain UNs.</div>
          <p className="mt-1 text-amber-800">
            Feature development targets needs where the device makes an outcome measurably better. Needs that are
            already met and merely need to stay met belong in sustaining engineering, not here.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-neutral-200 bg-white p-4 text-sm">
        <Checkbox
          checked={!!moa.improvementConfirmed}
          onCheckedChange={(c) =>
            edit(
              (m) => ({ ...m, improvementConfirmed: c === true }),
              c === true ? "Confirmed UN is an improvement" : "Withdrew UN improvement confirmation"
            )
          }
          className="mt-0.5"
        />
        <span>
          <span className="font-medium text-neutral-800">I confirm this is an improvement need.</span>
          <span className="block text-neutral-600">
            Acting on it should change a clinical outcome, not keep an existing one where it is.
          </span>
        </span>
      </label>
    </div>
  );
}
