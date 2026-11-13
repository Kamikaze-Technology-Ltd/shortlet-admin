"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, dateTime, day, money, type Booking } from "@/lib/api";
import { Badge, Button, Card, Drawer, Empty, ErrorText, Facts, Field, inputClass, Loading, Page, Pager, SearchBox, Select, StatusBadge, Table, Td, Toolbar, useFlash } from "./ui";

const PAGE_SIZE = 25;

/** Every booking on the platform. Opens filtered to a hotel (?hotel=slug) or a guest (?guest=id). */
export default function Bookings() {
  const params = useSearchParams();
  const hotel = params.get("hotel") ?? "";
  const guest = params.get("guest") ?? "";
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [status, setStatus] = useState("");
  const [stayType, setStayType] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Booking | null>(null);
  const query = {
    search,
    status,
    stay_type: stayType,
    source,
    check_in__gte: from,
    check_in__lte: to,
    unit__property__slug: hotel,
    guest,
    ordering,
    page,
    page_size: PAGE_SIZE,
  };
  const list = useQuery({ queryKey: ["bookings", query], queryFn: () => adminApi.bookings(query), placeholderData: (prev) => prev });
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <Page
      title="Bookings"
      subtitle={
        hotel || guest ? (
          <>
            Showing {hotel ? "one hotel's" : "one guest's"} bookings · <Link href="/bookings" className="font-medium text-brand-900 hover:underline">Show all</Link>
          </>
        ) : (
          "Every stay booked on Shortlet Stay, on the website, the app or by hotel staff."
        )
      }
      wide
    >
      <Toolbar>
        <SearchBox value={search} onChange={reset(setSearch)} placeholder="Reference, guest name, email or phone" />
        <Select label="Status" value={status} onChange={reset(setStatus)} options={[["", "Any status"], ["pending", "Pending"], ["confirmed", "Confirmed"], ["cancelled", "Cancelled"], ["expired", "Expired"]] as const} />
        <Select label="Stay" value={stayType} onChange={reset(setStayType)} options={[["", "Nights and hours"], ["night", "Nights"], ["hourly", "Hourly"]] as const} />
        <Select label="Source" value={source} onChange={reset(setSource)} options={[["", "Any source"], ["website", "Website / app"], ["staff", "Hotel staff"]] as const} />
        <label className="flex items-center gap-1 text-xs text-muted">
          Arriving
          <input type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} className="h-10 rounded-xl border border-brand-900/15 bg-white px-2 text-sm" aria-label="Arriving from" />
          –
          <input type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} className="h-10 rounded-xl border border-brand-900/15 bg-white px-2 text-sm" aria-label="Arriving until" />
        </label>
        <Select label="Sort" value={ordering} onChange={reset(setOrdering)} options={[["-created_at", "Newest booked"], ["-check_in", "Latest arrival"], ["check_in", "Earliest arrival"]] as const} />
      </Toolbar>
      <Card pad={false}>
        {list.isPending && <Loading />}
        {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
        {list.data && !list.data.results.length && <Empty>No bookings match.</Empty>}
        {!!list.data?.results.length && (
          <>
            <Table head={["Guest", "Hotel and room", "Stay", "Total", "Status", "Booked"]}>
              {list.data.results.map((b) => (
                <tr key={b.id} className="cursor-pointer hover:bg-mist" onClick={() => setOpen(b)}>
                  <Td>
                    <p className="font-medium text-brand-950">{b.guest_name}</p>
                    <p className="text-xs text-muted">{b.reference}</p>
                  </Td>
                  <Td>
                    <p>{b.property_name}</p>
                    <p className="text-xs text-muted">{b.unit_name}</p>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <p>{stay(b)}</p>
                    <p className="text-xs text-muted">{b.guests} guest{b.guests === 1 ? "" : "s"}</p>
                  </Td>
                  <Td>
                    {money(b.total_price)}
                    {b.is_paid && <p className="text-xs text-emerald-700">Paid</p>}
                    {b.awaiting_payment && <p className="text-xs text-amber-700">Awaiting payment</p>}
                  </Td>
                  <Td><StatusBadge status={b.status} /></Td>
                  <Td className="whitespace-nowrap">{day(b.created_at)}</Td>
                </tr>
              ))}
            </Table>
            <Pager page={page} count={list.data.count} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>
      {open && <BookingDrawer booking={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </Page>
  );
}

function stay(b: Booking) {
  if (b.stay_type === "hourly") {
    const start = new Date(b.starts_at);
    const end = new Date(b.ends_at);
    const t = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return `${day(b.starts_at)}, ${t(start)}–${t(end)} (${b.hours}h)`;
  }
  return `${day(b.check_in)} → ${day(b.check_out)} (${b.nights} night${b.nights === 1 ? "" : "s"})`;
}

function BookingDrawer({ booking: b, onChange, onClose }: { booking: Booking; onChange: (b: Booking) => void; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [flash, setFlash] = useFlash();
  const [notes, setNotes] = useState(b.notes);
  const done = (msg: string) => (updated: Booking) => {
    onChange(updated);
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
    setFlash(msg);
  };
  const confirm = useMutation({ mutationFn: () => adminApi.confirmBooking(b.id), onSuccess: done("Confirmed. The guest has been told.") });
  const decline = useMutation({ mutationFn: () => adminApi.declineBooking(b.id), onSuccess: done("Declined. Its dates are free again.") });
  const cancel = useMutation({ mutationFn: () => adminApi.updateBooking(b.id, { status: "cancelled" }), onSuccess: done("Cancelled. The guest has been told.") });
  const saveNotes = useMutation({ mutationFn: () => adminApi.updateBooking(b.id, { notes }), onSuccess: done("Notes saved.") });
  const error = confirm.error ?? decline.error ?? cancel.error ?? saveNotes.error;
  const active = b.status === "pending" || b.status === "confirmed";

  return (
    <Drawer
      title={<span className="flex items-center gap-2">{b.reference} <StatusBadge status={b.status} /></span>}
      onClose={onClose}
      footer={
        <>
          {b.status === "pending" && (
            <>
              <Button busy={confirm.isPending} onClick={() => confirm.mutate()}>Confirm</Button>
              <Button variant="outline" busy={decline.isPending} onClick={() => window.confirm("Decline this request? The guest is told and the dates are released.") && decline.mutate()}>
                Decline
              </Button>
            </>
          )}
          {active && (
            <Button variant="danger" className="ml-auto" busy={cancel.isPending} onClick={() => window.confirm("Cancel this booking? The guest is told. Refund any payment separately.") && cancel.mutate()}>
              Cancel booking
            </Button>
          )}
        </>
      }
    >
      {flash}
      <ErrorText error={error} />
      <Facts
        rows={[
          ["Guest", <>{b.guest_name}{b.guest && <> · <Link href={`/users/${b.guest}`} className="font-medium text-brand-900 hover:underline">account</Link></>}</>],
          ["Email", b.guest_email || "—"],
          ["Phone", b.guest_phone || "—"],
          ["Hotel", <Link key="h" href={`/hotels/${b.property_slug}`} className="font-medium text-brand-900 hover:underline">{b.property_name}</Link>],
          ["Room", b.unit_name],
          ["Stay", stay(b)],
          ["Guests", b.guests],
          ["Total", <>{money(b.total_price)}{Number(b.discount_amount) > 0 && <span className="text-muted"> (incl. {money(b.discount_amount)} discount)</span>}</>],
          ["Payment", b.is_paid ? <Badge tone="green">Paid</Badge> : b.awaiting_payment ? <Badge tone="amber">Awaiting payment</Badge> : "Not paid online"],
          ["Source", b.source === "website" ? "Website / app" : "Added by hotel staff"],
          ["Hold expires", b.hold_expires_at ? dateTime(b.hold_expires_at) : "—"],
          ["Booked", dateTime(b.created_at)],
          ["Updated", dateTime(b.updated_at)],
        ]}
      />
      <Link href={`/payments?search=${b.reference}`} className="text-sm font-medium text-brand-900 hover:underline">See its payments →</Link>
      <Field label="Internal notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </Field>
      <Button variant="outline" size="sm" busy={saveNotes.isPending} disabled={notes === b.notes} onClick={() => saveNotes.mutate()}>
        Save notes
      </Button>
    </Drawer>
  );
}
