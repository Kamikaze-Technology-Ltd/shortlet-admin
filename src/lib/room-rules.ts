import type { components } from "./api-schema";

export type CancellationPolicyKey = components["schemas"]["CancellationPolicyEnum"];

/** Mirrors backend properties/rules.py, for hosts choosing a policy. */
export const CANCELLATION_POLICIES: { value: CancellationPolicyKey; label: string; summary: string }[] = [
  { value: "flexible", label: "Flexible", summary: "Full refund up to a day before check-in." },
  { value: "moderate", label: "Moderate", summary: "Full refund up to 5 days before check-in, then half back until a day before." },
  { value: "firm", label: "Firm", summary: "Full refund within 24 hours of booking, then half back up to 7 days before check-in." },
  { value: "strict", label: "Strict", summary: "Full refund within 24 hours of booking, then half back up to 14 days before check-in." },
];

/** A room's house rules, safety details and cancellation policy, as hosts edit them. */
export type RoomRulesInput = {
  pets_allowed: boolean;
  smoking_allowed: boolean;
  parties_allowed: boolean;
  commercial_photography_allowed: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  additional_rules: string;
  has_exterior_cameras: boolean;
  cameras_note: string;
  has_carbon_monoxide_alarm: boolean;
  has_smoke_alarm: boolean;
  cancellation_policy: CancellationPolicyKey;
};

/** A new room starts with the same rules the API gives it. */
export function roomRules(unit?: Partial<RoomRulesInput> | null): RoomRulesInput {
  return {
    pets_allowed: unit?.pets_allowed ?? false,
    smoking_allowed: unit?.smoking_allowed ?? false,
    parties_allowed: unit?.parties_allowed ?? false,
    commercial_photography_allowed: unit?.commercial_photography_allowed ?? false,
    quiet_hours_start: unit ? (unit.quiet_hours_start?.slice(0, 5) ?? null) : "22:00",
    quiet_hours_end: unit ? (unit.quiet_hours_end?.slice(0, 5) ?? null) : "07:00",
    additional_rules: unit?.additional_rules ?? "",
    has_exterior_cameras: unit?.has_exterior_cameras ?? false,
    cameras_note: unit?.cameras_note ?? "",
    has_carbon_monoxide_alarm: unit?.has_carbon_monoxide_alarm ?? false,
    has_smoke_alarm: unit?.has_smoke_alarm ?? false,
    cancellation_policy: unit?.cancellation_policy ?? "firm",
  };
}
