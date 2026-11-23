"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi, isSuperAdmin, STAFF_AREAS, type StaffArea } from "@/lib/api";
import { Check } from "./ui";

export type Access = { is_staff: boolean; is_superuser: boolean; staff_areas: StaffArea[] };

/**
 * Whether an account is on the Shortlet Stay team, and at what level: super admins do everything (including managing the
 * team); other staff only the areas ticked here. Only super admins can change it.
 */
export default function StaffAccess({ value, onChange, error }: { value: Access; onChange: (next: Access) => void; error?: string }) {
  const me = useQuery({ queryKey: ["me"], queryFn: authApi.me });
  const editable = isSuperAdmin(me.data);
  const set = (patch: Partial<Access>) => onChange({ ...value, ...patch });
  const toggleArea = (area: StaffArea, on: boolean) =>
    set({ staff_areas: on ? [...value.staff_areas, area] : value.staff_areas.filter((a) => a !== area) });

  return (
    <div className="space-y-3 rounded-2xl bg-cream/60 p-4">
      <Check
        label="Shortlet Stay staff (can use this admin)"
        checked={value.is_staff}
        disabled={!editable}
        onChange={(v) => set({ is_staff: v, is_superuser: v && value.is_superuser, staff_areas: v ? value.staff_areas : [] })}
      />
      {value.is_staff && (
        <>
          <fieldset className="space-y-2" disabled={!editable}>
            <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">Level</legend>
            <label className={`flex items-start gap-2 text-sm ${editable ? "" : "opacity-50"}`}>
              <input type="radio" checked={value.is_superuser} onChange={() => set({ is_superuser: true })} className="mt-0.5 size-4 accent-brand-950" />
              <span>
                <span className="font-medium text-brand-950">Super admin</span>
                <span className="block text-xs text-muted">Everything, including adding and removing staff and choosing what they look after.</span>
              </span>
            </label>
            <label className={`flex items-start gap-2 text-sm ${editable ? "" : "opacity-50"}`}>
              <input type="radio" checked={!value.is_superuser} onChange={() => set({ is_superuser: false })} className="mt-0.5 size-4 accent-brand-950" />
              <span>
                <span className="font-medium text-brand-950">Staff</span>
                <span className="block text-xs text-muted">Only the areas ticked below.</span>
              </span>
            </label>
          </fieldset>
          {!value.is_superuser && (
            <fieldset className="grid gap-2 sm:grid-cols-2" disabled={!editable}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">Looks after</legend>
              {STAFF_AREAS.map((a) => (
                <Check
                  key={a.value}
                  disabled={!editable}
                  label={
                    <span>
                      <span className="font-medium text-brand-950">{a.label}</span>
                      <span className="block text-xs text-muted">{a.hint}</span>
                    </span>
                  }
                  checked={value.staff_areas.includes(a.value)}
                  onChange={(on) => toggleArea(a.value, on)}
                />
              ))}
            </fieldset>
          )}
          {!value.is_superuser && !value.staff_areas.length && (
            <p className="text-xs text-amber-800">With no areas ticked they can only see the overview.</p>
          )}
        </>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
      <p className="text-xs text-muted">{editable ? "Only super admins can change this." : "Only a super admin can change this."}</p>
    </div>
  );
}
