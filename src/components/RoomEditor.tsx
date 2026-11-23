"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Percent, Trash2 } from "lucide-react";
import { ApiError, adminApi, day, type Room } from "@/lib/api";
import { CANCELLATION_POLICIES, roomRules } from "@/lib/room-rules";
import { Button, Check, Drawer, ErrorText, Field, inputClass } from "./ui";

/** Add or edit a room. Photos and discounts appear once the room exists. */
export default function RoomEditor({ hotel, room: initial, onClose }: { hotel: string; room: Room | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  // After creating, keep editing the new room so photos can be added straight away.
  const [slug, setSlug] = useState(initial?.slug ?? null);
  const live = useQuery({ queryKey: ["room", slug], queryFn: () => adminApi.room(slug!), enabled: !!slug, initialData: initial ?? undefined });
  const room = live.data ?? null;
  const amenities = useQuery({ queryKey: ["amenities"], queryFn: adminApi.amenities, staleTime: 60_000 });
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    summary: initial?.summary ?? "",
    description: initial?.description ?? "",
    bedrooms: initial?.bedrooms ?? 1,
    beds: initial?.beds ?? 1,
    bathrooms: initial?.bathrooms ?? 1,
    max_guests: initial?.max_guests ?? 2,
    size_sqm: initial?.size_sqm ?? null,
    base_price: initial?.base_price ?? "",
    min_nights: initial?.min_nights ?? 1,
    max_nights: initial?.max_nights ?? 90,
    check_in_time: initial?.check_in_time?.slice(0, 5) ?? "14:00",
    check_out_time: initial?.check_out_time?.slice(0, 5) ?? "11:00",
    amenities: initial?.amenities ?? [],
    is_published: initial?.is_published ?? false,
    is_featured: initial?.is_featured ?? false,
    ...roomRules(initial),
  });
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["rooms", hotel] });
    queryClient.invalidateQueries({ queryKey: ["hotel", hotel] });
    queryClient.invalidateQueries({ queryKey: ["hotels"] });
  };
  const save = useMutation({
    mutationFn: () => adminApi.saveRoom(slug, { ...form, property: hotel }),
    onSuccess: (r) => {
      queryClient.setQueryData(["room", r.slug], r);
      refresh();
      if (!slug) setSlug(r.slug);
      else onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deleteRoom(slug!),
    onSuccess: () => {
      refresh();
      onClose();
    },
  });
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const num = (k: "bedrooms" | "beds" | "bathrooms" | "max_guests" | "min_nights" | "max_nights", min = 0) => (
    <input type="number" min={min} value={form[k]} onChange={(e) => set(k)(Number(e.target.value))} className={inputClass} />
  );

  return (
    <Drawer
      title={room ? room.name : "New room"}
      onClose={onClose}
      footer={
        <>
          <Button busy={save.isPending} onClick={() => save.mutate()}>{slug ? "Save room" : "Create room"}</Button>
          <Button variant="ghost" onClick={onClose}>{slug ? "Close" : "Cancel"}</Button>
          {slug && (
            <Button variant="danger" className="ml-auto" busy={remove.isPending} onClick={() => window.confirm("Delete this room and its photos?") && remove.mutate()}>
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
        </>
      }
    >
      {save.error && !Object.keys(fields).length && <ErrorText error={save.error} />}
      {remove.error && <ErrorText error={remove.error} />}
      <Field label="Name" error={fields.name}>
        <input value={form.name} onChange={(e) => set("name")(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Summary" error={fields.summary} hint="One line on listing cards.">
        <input value={form.summary} maxLength={200} onChange={(e) => set("summary")(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Description" error={fields.description}>
        <textarea value={form.description} rows={4} onChange={(e) => set("description")(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Bedrooms" error={fields.bedrooms}>{num("bedrooms")}</Field>
        <Field label="Beds" error={fields.beds}>{num("beds")}</Field>
        <Field label="Baths" error={fields.bathrooms}>{num("bathrooms")}</Field>
        <Field label="Sleeps" error={fields.max_guests}>{num("max_guests", 1)}</Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price per night" error={fields.base_price} hint="What guests pay for the room each night.">
          <input type="number" min={1} step="0.01" value={form.base_price} onChange={(e) => set("base_price")(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Size (m²)" error={fields.size_sqm}>
          <input type="number" min={0} value={form.size_sqm ?? ""} onChange={(e) => set("size_sqm")(e.target.value ? Number(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Min nights" error={fields.min_nights}>{num("min_nights", 1)}</Field>
        <Field label="Max nights" error={fields.max_nights}>{num("max_nights", 1)}</Field>
        <Field label="Check-in" error={fields.check_in_time}>
          <input type="time" value={form.check_in_time} onChange={(e) => set("check_in_time")(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Check-out" error={fields.check_out_time}>
          <input type="time" value={form.check_out_time} onChange={(e) => set("check_out_time")(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Amenities" error={fields.amenities}>
        <div className="flex flex-wrap gap-2">
          {amenities.data?.map((a) => {
            const on = form.amenities.includes(a.slug);
            return (
              <button
                type="button"
                key={a.slug}
                onClick={() => set("amenities")(on ? form.amenities.filter((s) => s !== a.slug) : [...form.amenities, a.slug])}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${on ? "bg-brand-950 text-white ring-brand-950" : "bg-white text-brand-900 ring-brand-900/15"}`}
              >
                {a.name}
              </button>
            );
          })}
        </div>
      </Field>
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">House rules</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Check label="Pets allowed" checked={form.pets_allowed} onChange={set("pets_allowed")} />
          <Check label="Smoking allowed (incl. vaping)" checked={form.smoking_allowed} onChange={set("smoking_allowed")} />
          <Check label="Parties or events allowed" checked={form.parties_allowed} onChange={set("parties_allowed")} />
          <Check label="Commercial photography allowed" checked={form.commercial_photography_allowed} onChange={set("commercial_photography_allowed")} />
          <Check
            label="Quiet hours"
            checked={form.quiet_hours_start !== null}
            onChange={(on) => setForm((f) => ({ ...f, quiet_hours_start: on ? "22:00" : null, quiet_hours_end: on ? "07:00" : null }))}
          />
        </div>
        {form.quiet_hours_start !== null && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quiet from" error={fields.quiet_hours_start}>
              <input type="time" value={form.quiet_hours_start ?? ""} onChange={(e) => set("quiet_hours_start")(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Quiet until" error={fields.quiet_hours_end}>
              <input type="time" value={form.quiet_hours_end ?? ""} onChange={(e) => set("quiet_hours_end")(e.target.value)} className={inputClass} />
            </Field>
          </div>
        )}
        <Field label="Other rules" error={fields.additional_rules} hint="One rule per line.">
          <textarea value={form.additional_rules} rows={3} onChange={(e) => set("additional_rules")(e.target.value)} className={inputClass} />
        </Field>
      </section>
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">Safety &amp; property</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Check label="Exterior security cameras" checked={form.has_exterior_cameras} onChange={set("has_exterior_cameras")} />
          <Check label="Carbon monoxide alarm" checked={form.has_carbon_monoxide_alarm} onChange={set("has_carbon_monoxide_alarm")} />
          <Check label="Smoke alarm" checked={form.has_smoke_alarm} onChange={set("has_smoke_alarm")} />
        </div>
        {form.has_exterior_cameras && (
          <Field label="About the cameras" error={fields.cameras_note} hint="Where they are and what they cover.">
            <input value={form.cameras_note} maxLength={300} onChange={(e) => set("cameras_note")(e.target.value)} className={inputClass} />
          </Field>
        )}
      </section>
      <Field label="Cancellation policy" error={fields.cancellation_policy}>
        <select value={form.cancellation_policy} onChange={(e) => set("cancellation_policy")(e.target.value as typeof form.cancellation_policy)} className={inputClass}>
          {CANCELLATION_POLICIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}: {p.summary}
            </option>
          ))}
        </select>
      </Field>
      <div className="space-y-2 rounded-2xl bg-cream/60 p-4">
        <Check label="Published: guests can see and book it" checked={form.is_published} onChange={set("is_published")} />
        <Check label="Featured on the home page" checked={form.is_featured} onChange={set("is_featured")} />
      </div>
      {room ? (
        <>
          <Photos room={room} />
          <Discounts room={room} />
        </>
      ) : (
        <p className="text-sm text-muted">Add photos and discounts once the room is created.</p>
      )}
    </Drawer>
  );
}

function Photos({ room }: { room: Room }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ["room", room.slug] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
  };
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      let position = room.images.length;
      for (const file of files) await adminApi.uploadImage(room.slug, file, position++);
    },
    onSettled: reload,
  });
  const remove = useMutation({ mutationFn: (id: number) => adminApi.deleteImage(room.slug, id), onSuccess: reload });

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">Photos</h3>
      <div className="grid grid-cols-3 gap-2">
        {room.images.map((img, i) => (
          <div key={img.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.image} alt={img.alt_text} className="size-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 text-[0.65rem] font-semibold">Cover</span>}
            <button
              onClick={() => window.confirm("Delete this photo?") && remove.mutate(img.id)}
              aria-label="Delete photo"
              className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1.5 text-red-700 opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
          className="grid aspect-[4/3] place-items-center rounded-xl border-2 border-dashed border-brand-900/15 text-sm text-muted hover:border-brand-900/40"
        >
          {upload.isPending ? <Loader2 className="size-5 animate-spin" /> : <span className="flex flex-col items-center gap-1"><ImagePlus className="size-5" /> Add photos</span>}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) upload.mutate(files);
          e.target.value = "";
        }}
      />
      {(upload.error || remove.error) && <div className="mt-2"><ErrorText error={upload.error ?? remove.error} /></div>}
    </section>
  );
}

function Discounts({ room }: { room: Room }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ label: "", percent: "", starts_on: "", ends_on: "" });
  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ["room", room.slug] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
  };
  const add = useMutation({
    mutationFn: () => adminApi.addDiscount(room.slug, { label: form.label, percent: Number(form.percent), starts_on: form.starts_on || null, ends_on: form.ends_on || null }),
    onSuccess: () => {
      setForm({ label: "", percent: "", starts_on: "", ends_on: "" });
      reload();
    },
  });
  const remove = useMutation({ mutationFn: (id: number) => adminApi.deleteDiscount(room.slug, id), onSuccess: reload });
  const fields = add.error instanceof ApiError ? add.error.fields : {};

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">
        <Percent className="size-3.5" /> Discounts
      </h3>
      <ul className="mb-3 divide-y divide-brand-900/5 rounded-xl bg-white ring-1 ring-brand-900/10">
        {!room.discounts.length && <li className="px-3 py-2 text-sm text-muted">None.</li>}
        {room.discounts.map((d) => (
          <li key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="font-semibold text-brand-950">{d.percent}% off</span>
            <span className="text-muted">{d.label && `${d.label} · `}{d.starts_on ? day(d.starts_on) : "Now"} – {d.ends_on ? day(d.ends_on) : "no end"}</span>
            <button onClick={() => remove.mutate(d.id)} aria-label="Delete discount" className="ml-auto rounded-full p-1.5 text-muted hover:bg-red-50 hover:text-red-700">
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputClass} aria-label="Discount label" />
        <input placeholder="% off" type="number" min={1} max={99} value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} className={inputClass} aria-label="Percent off" />
        <input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} className={inputClass} aria-label="First night" />
        <input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} className={inputClass} aria-label="Last night" />
      </div>
      {Object.values(fields).length > 0 && <p className="mt-1 text-xs text-red-700">{Object.values(fields).join(" ")}</p>}
      {(add.error && !Object.keys(fields).length) || remove.error ? <div className="mt-2"><ErrorText error={add.error ?? remove.error} /></div> : null}
      <Button variant="outline" size="sm" className="mt-2" busy={add.isPending} disabled={!form.percent} onClick={() => add.mutate()}>
        Add discount
      </Button>
    </section>
  );
}
