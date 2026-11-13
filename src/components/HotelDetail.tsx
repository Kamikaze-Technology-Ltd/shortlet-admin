"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BedDouble, Plus, Star, Trash2 } from "lucide-react";
import { ApiError, adminApi, money, type Hotel, type Property, type Room } from "@/lib/api";
import { Badge, Button, Card, Check, Empty, ErrorText, Field, inputClass, LinkButton, Loading, Page, SearchBox, Table, Td, useFlash } from "./ui";
import RoomEditor from "./RoomEditor";

/** A hotel: its details, who owns it, and its rooms. `slug` null: adding a new hotel. */
export default function HotelDetail({ slug }: { slug: string | null }) {
  const property = useQuery({ queryKey: ["property", slug], queryFn: () => adminApi.property(slug!), enabled: !!slug });
  const hotel = useQuery({ queryKey: ["hotel", slug], queryFn: () => adminApi.hotel(slug!), enabled: !!slug });

  if (!slug) {
    return (
      <Page title="Add a hotel" subtitle={<Back />}>
        <HotelForm property={null} />
        <p className="text-sm text-muted">New hotels are managed by Shortlet Stay. Give one to a hotel owner after it&apos;s saved.</p>
      </Page>
    );
  }
  if (property.isPending || hotel.isPending) return <Page title="Hotel" subtitle={<Back />}><Loading /></Page>;
  if (property.error || hotel.error) return <Page title="Hotel" subtitle={<Back />}><ErrorText error={property.error ?? hotel.error} /></Page>;
  const h = hotel.data;

  return (
    <Page
      wide
      title={
        <span className="flex flex-wrap items-center gap-3">
          {h.name} {h.is_active ? <Badge tone="green">Live</Badge> : <Badge>Hidden</Badge>}
        </span>
      }
      subtitle={<Back />}
      actions={<LinkButton variant="outline" href={`/bookings?hotel=${h.slug}`}>Bookings ({h.booking_count})</LinkButton>}
    >
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <HotelForm property={property.data} />
        <div className="space-y-6">
          <OwnerCard hotel={h} />
          <Card title="Guests say">
            {h.rating !== null ? (
              <p className="flex items-center gap-2 text-sm">
                <Star className="size-4 fill-gold-400 text-gold-400" /> <span className="font-display text-2xl text-brand-950">{h.rating.toFixed(1)}</span> from {h.review_count} review{h.review_count === 1 ? "" : "s"}
                <Link href={`/reviews?hotel=${h.slug}`} className="ml-auto font-medium text-brand-900 hover:underline">Read them</Link>
              </p>
            ) : (
              <p className="text-sm text-muted">No reviews yet.</p>
            )}
          </Card>
        </div>
      </div>
      <Rooms hotel={h} />
      <DeleteHotel hotel={h} />
    </Page>
  );
}

const Back = () => (
  <Link href="/hotels" className="inline-flex items-center gap-1 hover:text-brand-900">
    <ArrowLeft className="size-3.5" /> All hotels
  </Link>
);

function HotelForm({ property }: { property: Property | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [flash, setFlash] = useFlash();
  const countries = useQuery({ queryKey: ["countries"], queryFn: adminApi.countries, staleTime: Infinity });
  const [form, setForm] = useState({
    name: property?.name ?? "",
    description: property?.description ?? "",
    address: property?.address ?? "",
    area: property?.area ?? "",
    city: property?.city ?? "",
    state: property?.state ?? "",
    country: (property?.country ?? "") as string,
    latitude: property?.latitude ?? "",
    longitude: property?.longitude ?? "",
    is_active: property?.is_active ?? true,
  });
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () =>
      adminApi.saveProperty(property?.slug ?? null, {
        ...form,
        country: form.country as Property["country"],
        latitude: form.latitude || null,
        longitude: form.longitude || null,
      }),
    onSuccess: (p) => {
      queryClient.setQueryData(["property", p.slug], p);
      queryClient.invalidateQueries({ queryKey: ["hotel", p.slug] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      if (!property) router.replace(`/hotels/${p.slug}`);
      else setFlash("Saved.");
    },
  });
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const text = (k: "name" | "address" | "area" | "city" | "state" | "latitude" | "longitude") => (
    <input value={form[k] ?? ""} onChange={(e) => set(k)(e.target.value)} className={inputClass} />
  );

  return (
    <Card title={property ? "Hotel details" : undefined}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <Field label="Name" error={fields.name}>{text("name")}</Field>
        <Field label="Description" error={fields.description}>
          <textarea value={form.description} onChange={(e) => set("description")(e.target.value)} rows={5} className={inputClass} />
        </Field>
        <Field label="Street address" error={fields.address} hint="Only shown to guests with a confirmed booking.">{text("address")}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Area" error={fields.area} hint="The neighbourhood guests see.">{text("area")}</Field>
          <Field label="City" error={fields.city}>{text("city")}</Field>
          <Field label="State" error={fields.state}>{text("state")}</Field>
          <Field label="Country" error={fields.country} hint="Guests only find hotels in the country they browse.">
            <select value={form.country} onChange={(e) => set("country")(e.target.value)} className={inputClass}>
              <option value="">Choose…</option>
              {property?.country && !countries.data?.some((c) => c.code === property.country) && <option value={property.country}>{property.country_name}</option>}
              {countries.data?.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Latitude" error={fields.latitude}>{text("latitude")}</Field>
          <Field label="Longitude" error={fields.longitude}>{text("longitude")}</Field>
        </div>
        <Check label="Live: guests can find and book it" checked={form.is_active} onChange={set("is_active")} />
        {save.error && !Object.keys(fields).length && <ErrorText error={save.error} />}
        {flash}
        <Button busy={save.isPending}>{property ? "Save hotel" : "Create hotel"}</Button>
      </form>
    </Card>
  );
}

function OwnerCard({ hotel }: { hotel: Hotel }) {
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const owners = useQuery({
    queryKey: ["users", { role: "owner", search, is_active: "true", page_size: 8 }],
    queryFn: () => adminApi.users({ role: "owner", search, is_active: "true", page_size: 8 }),
    enabled: picking,
  });
  const assign = useMutation({
    mutationFn: (owner: number | null) => adminApi.assignOwner(hotel.slug, owner),
    onSuccess: (h) => {
      queryClient.setQueryData(["hotel", hotel.slug], h);
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setPicking(false);
    },
  });

  return (
    <Card title="Owner">
      {hotel.owner_id ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Link href={`/users/${hotel.owner_id}`} className="font-medium text-brand-950 hover:underline">{hotel.owner_name}</Link>
            <p className="truncate text-xs text-muted">{hotel.owner_email}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Managed by Shortlet Stay staff. No owner account sees it in their dashboard.</p>
      )}
      {picking ? (
        <div className="mt-4 space-y-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Find a hotel owner" />
          {owners.isPending && <Loading />}
          <ul className="divide-y divide-brand-900/5">
            {owners.data?.results.map((o) => (
              <li key={o.id}>
                <button
                  disabled={assign.isPending || o.id === hotel.owner_id}
                  onClick={() => assign.mutate(o.id)}
                  className="w-full px-2 py-2 text-left text-sm hover:bg-mist disabled:opacity-50"
                >
                  <span className="font-medium text-brand-950">{o.name}</span> <span className="text-muted">· {o.email} · {o.hotel_count} hotel{o.hotel_count === 1 ? "" : "s"}</span>
                </button>
              </li>
            ))}
          </ul>
          {owners.data && !owners.data.results.length && (
            <p className="text-sm text-muted">
              No hotel owners match. <Link href="/owners" className="font-medium text-brand-900 hover:underline">Add one</Link> first.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {hotel.owner_id && (
              <Button variant="outline" size="sm" busy={assign.isPending} onClick={() => assign.mutate(null)}>
                Take it back for Shortlet Stay
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setPicking(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setPicking(true)}>
          {hotel.owner_id ? "Change owner" : "Give to an owner"}
        </Button>
      )}
      {assign.error && <div className="mt-3"><ErrorText error={assign.error} /></div>}
    </Card>
  );
}

function Rooms({ hotel }: { hotel: Hotel }) {
  const rooms = useQuery({ queryKey: ["rooms", hotel.slug], queryFn: () => adminApi.rooms({ property__slug: hotel.slug }) });
  const [open, setOpen] = useState<Room | "new" | null>(null);

  return (
    <Card
      title={<span className="flex items-center gap-2"><BedDouble className="size-5" /> Rooms</span>}
      pad={false}
      actions={<Button size="sm" onClick={() => setOpen("new")}><Plus className="size-4" /> Add room</Button>}
    >
      {rooms.isPending && <Loading />}
      {rooms.error && <div className="p-4"><ErrorText error={rooms.error} /></div>}
      {rooms.data && !rooms.data.results.length && <Empty>No rooms yet.</Empty>}
      {!!rooms.data?.results.length && (
        <Table head={["Room", "Sleeps", "Per night", "Per hour", "Photos", "Status"]}>
          {rooms.data.results.map((r) => (
            <tr key={r.id} className="cursor-pointer hover:bg-mist" onClick={() => setOpen(r)}>
              <Td>
                <div className="flex items-center gap-3">
                  {r.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.images[0].image} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="size-10 shrink-0 rounded-lg bg-cream" />
                  )}
                  <div>
                    <p className="font-medium text-brand-950">{r.name}</p>
                    <p className="text-xs text-muted">{r.bedrooms} bedroom{r.bedrooms === 1 ? "" : "s"} · {r.bathrooms} bath</p>
                  </div>
                </div>
              </Td>
              <Td>{r.max_guests}</Td>
              <Td>{money(r.base_price)}</Td>
              <Td>{r.hourly_enabled ? money(r.hourly_rate) : <span className="text-muted">Off</span>}</Td>
              <Td>{r.images.length}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {r.is_published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}
                  {r.is_featured && <Badge tone="amber">Featured</Badge>}
                  {!!r.discounts.length && <Badge tone="blue">{r.discounts.length} discount{r.discounts.length === 1 ? "" : "s"}</Badge>}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {open && <RoomEditor hotel={hotel.slug} room={open === "new" ? null : open} onClose={() => setOpen(null)} />}
    </Card>
  );
}

function DeleteHotel({ hotel }: { hotel: Hotel }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => adminApi.deleteProperty(hotel.slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      router.replace("/hotels");
    },
  });
  return (
    <Card title="Delete this hotel">
      <p className="text-sm text-muted">
        Deletes the hotel and all its rooms and photos. Hotels with bookings can&apos;t be deleted: hide them instead, so their bookings and payments stay on record.
      </p>
      {remove.error && <div className="mt-3"><ErrorText error={remove.error} /></div>}
      <Button
        variant="danger"
        className="mt-4"
        busy={remove.isPending}
        disabled={hotel.booking_count > 0}
        onClick={() => window.confirm(`Delete ${hotel.name} and its ${hotel.unit_count} rooms? This can't be undone.`) && remove.mutate()}
      >
        <Trash2 className="size-4" /> Delete hotel
      </Button>
    </Card>
  );
}
