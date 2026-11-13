"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ApiError, adminApi, type Amenity } from "@/lib/api";
import { Button, Card, Empty, ErrorText, Field, inputClass, Loading, Page } from "./ui";

// The icon keys the website and app know how to draw (properties.models.Amenity.Icon).
const ICONS = [
  ["zap", "Power"],
  ["wifi", "Wi-Fi"],
  ["shield", "Security"],
  ["sparkles", "Cleaning"],
  ["tv", "TV"],
  ["utensils", "Kitchen"],
  ["car", "Parking"],
  ["key", "Self check-in"],
  ["snowflake", "Air conditioning"],
  ["washing-machine", "Washer"],
  ["laptop", "Workspace"],
  ["waves", "Pool"],
  ["dumbbell", "Gym"],
  ["check", "Other"],
] as const;

/** The amenity list hotels pick from for their rooms. */
export default function Amenities() {
  const amenities = useQuery({ queryKey: ["amenities"], queryFn: adminApi.amenities });
  const [editing, setEditing] = useState<Amenity | "new" | null>(null);

  return (
    <Page
      title="Amenities"
      subtitle="What rooms can offer. Hotel owners tick these for each room, and guests filter by them."
      actions={<Button onClick={() => setEditing("new")}><Plus className="size-4" /> New amenity</Button>}
    >
      <Card pad={false}>
        {amenities.isPending && <Loading />}
        {amenities.error && <div className="p-4"><ErrorText error={amenities.error} /></div>}
        {amenities.data && !amenities.data.length && editing !== "new" && <Empty>No amenities yet.</Empty>}
        <ul className="divide-y divide-brand-900/5">
          {editing === "new" && (
            <li className="p-4">
              <Editor amenity={null} onDone={() => setEditing(null)} />
            </li>
          )}
          {amenities.data?.map((a) => (
            <li key={a.slug} className="p-4">
              {editing !== "new" && editing?.slug === a.slug ? (
                <Editor amenity={a} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-medium text-brand-950">{a.name}</span>
                  <span className="text-xs text-muted">icon: {ICONS.find(([k]) => k === a.icon)?.[1] ?? a.icon}</span>
                  <button onClick={() => setEditing(a)} aria-label={`Edit ${a.name}`} className="ml-auto rounded-full p-2 text-muted hover:bg-cream hover:text-brand-900">
                    <Pencil className="size-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}

function Editor({ amenity, onDone }: { amenity: Amenity | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(amenity?.name ?? "");
  const [icon, setIcon] = useState<Amenity["icon"]>(amenity?.icon ?? "check");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["amenities"] });
    onDone();
  };
  const save = useMutation({ mutationFn: () => adminApi.saveAmenity(amenity?.slug ?? null, { name, icon }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => adminApi.deleteAmenity(amenity!.slug), onSuccess: refresh });
  const fields = save.error instanceof ApiError ? save.error.fields : {};

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
    >
      <Field label="Name" error={fields.name}>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className={inputClass} autoFocus />
      </Field>
      <Field label="Icon" error={fields.icon}>
        <select value={icon} onChange={(e) => setIcon(e.target.value as Amenity["icon"])} className={inputClass}>
          {ICONS.map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </Field>
      <div className="flex gap-2">
        <Button busy={save.isPending}>Save</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        {amenity && (
          <Button type="button" variant="danger" busy={remove.isPending} onClick={() => window.confirm(`Delete "${amenity.name}"? Rooms that have it lose it.`) && remove.mutate()} aria-label="Delete">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {(save.error || remove.error) && !Object.keys(fields).length && <div className="sm:col-span-3"><ErrorText error={save.error ?? remove.error} /></div>}
    </form>
  );
}
