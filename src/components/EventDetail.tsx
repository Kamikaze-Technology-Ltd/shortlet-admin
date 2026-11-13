"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ApiError, adminApi, api, dateTime, money, type Event } from "@/lib/api";
import { Badge, Button, Card, Empty, ErrorText, Facts, Field, inputClass, Loading, Page, Pager, SearchBox, Stat, StatusBadge, Table, Tabs, Td, useFlash } from "./ui";

export default function EventDetail({ slug }: { slug: string }) {
  const event = useQuery({ queryKey: ["event", slug], queryFn: () => adminApi.event(slug) });
  if (event.isPending) return <Page title="Event" subtitle={<Back />}><Loading /></Page>;
  if (event.error) return <Page title="Event" subtitle={<Back />}><ErrorText error={event.error} /></Page>;
  return <Detail e={event.data} />;
}

const Back = () => (
  <Link href="/events" className="inline-flex items-center gap-1 hover:text-brand-900">
    <ArrowLeft className="size-3.5" /> All events
  </Link>
);

function Detail({ e }: { e: Event }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [flash, setFlash] = useFlash();
  const [tab, setTab] = useState<"orders" | "attendees" | "edit">("orders");
  const update = (msg: string) => (data: Event) => {
    queryClient.setQueryData(["event", e.slug], data);
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
    setFlash(msg);
  };
  const act = useMutation({
    mutationFn: (action: "publish" | "unpublish" | "cancel") => adminApi.eventAction(e.slug, action),
    onSuccess: (data, action) => update({ publish: "Published.", unpublish: "Back to draft.", cancel: "Cancelled. Ticket holders have been told." }[action])(data),
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deleteEvent(e.slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      router.replace("/events");
    },
  });

  return (
    <Page
      wide
      title={<span className="flex flex-wrap items-center gap-3">{e.title} <StatusBadge status={e.status} /></span>}
      subtitle={<Back />}
      actions={
        <>
          {e.status === "draft" && <Button busy={act.isPending && act.variables === "publish"} onClick={() => act.mutate("publish")}>Publish</Button>}
          {e.status === "published" && (
            <Button variant="outline" busy={act.isPending && act.variables === "unpublish"} onClick={() => act.mutate("unpublish")}>Unpublish</Button>
          )}
          {e.status !== "cancelled" && (
            <Button
              variant="danger"
              busy={act.isPending && act.variables === "cancel"}
              onClick={() => window.confirm("Cancel this event? Every ticket holder is told, and online payments are flagged for refund.") && act.mutate("cancel")}
            >
              Cancel event
            </Button>
          )}
          <Button variant="ghost" busy={remove.isPending} onClick={() => window.confirm("Delete this event? Only possible when nobody has ordered tickets.") && remove.mutate()} aria-label="Delete event">
            <Trash2 className="size-4" />
          </Button>
        </>
      }
    >
      {flash}
      <ErrorText error={act.error ?? remove.error} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Sold" value={`${e.stats.sold} / ${e.stats.capacity}`} />
        <Stat label="Checked in" value={e.stats.checked_in} />
        <Stat label="Revenue" value={money(e.stats.revenue)} />
        <Stat label="Pending orders" value={e.stats.pending_orders} tone={e.stats.pending_orders ? "warn" : undefined} />
        <Stat label="Ticket types" value={e.ticket_types.length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Details">
          <Facts
            rows={[
              ["When", e.when_label],
              ["Where", [e.venue_name, e.address, e.city, e.country].filter(Boolean).join(", ")],
              ["Organiser", e.organiser_id ? <Link key="o" href={`/users/${e.organiser_id}`} className="font-medium text-brand-900 hover:underline">{e.organiser_email}</Link> : "Shortlet Stay"],
              ["Created", dateTime(e.created_at)],
            ]}
          />
          {e.summary && <p className="mt-4 text-sm text-muted">{e.summary}</p>}
        </Card>
        <Card title="Tickets" pad={false}>
          {e.ticket_types.length ? (
            <Table head={["Ticket", "Price", "Sold or held", "On sale until"]}>
              {e.ticket_types.map((t) => (
                <tr key={t.id}>
                  <Td>
                    <p className="font-medium text-brand-950">{t.name}</p>
                    {t.description && <p className="text-xs text-muted">{t.description}</p>}
                  </Td>
                  <Td>{Number(t.price) ? money(t.price) : <Badge tone="green">Free</Badge>}</Td>
                  <Td>{t.held} / {t.quantity}</Td>
                  <Td>{t.sales_end ? dateTime(t.sales_end) : "Event end"}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty>No tickets set up.</Empty>
          )}
        </Card>
      </div>
      <Tabs value={tab} onChange={setTab} options={[["orders", "Orders"], ["attendees", "Attendees"], ["edit", "Edit details"]] as const} />
      {tab === "orders" && <Orders slug={e.slug} />}
      {tab === "attendees" && <Attendees slug={e.slug} />}
      {tab === "edit" && <EditEvent e={e} onSaved={update("Saved.")} />}
    </Page>
  );
}

function Orders({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const query = { status, page };
  const orders = useQuery({ queryKey: ["event-orders", slug, query], queryFn: () => adminApi.eventOrders(slug, query), placeholderData: (prev) => prev });
  const act = useMutation({
    mutationFn: ({ reference, action }: { reference: string; action: "confirm" | "decline" }) => adminApi.orderAction(slug, reference, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-orders", slug] });
      queryClient.invalidateQueries({ queryKey: ["event", slug] });
    },
  });

  return (
    <Card
      pad={false}
      actions={
        <Tabs
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[["", "All"], ["pending", "Pending"], ["confirmed", "Confirmed"], ["cancelled", "Cancelled"]] as const}
        />
      }
    >
      {act.error && <div className="p-4"><ErrorText error={act.error} /></div>}
      {orders.isPending && <Loading />}
      {orders.data && !orders.data.results.length && <Empty>No orders.</Empty>}
      {!!orders.data?.results.length && (
        <>
          <Table head={["Buyer", "Tickets", "Total", "Status", "Ordered", ""]}>
            {orders.data.results.map((o) => (
              <tr key={o.reference}>
                <Td>
                  <p className="font-medium text-brand-950">{o.buyer_name}</p>
                  <p className="text-xs text-muted">{o.reference} · {o.buyer_email}</p>
                </Td>
                <Td>{o.tickets.map((t) => t.ticket_type).join(", ")}</Td>
                <Td>{money(o.total_price, o.currency)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={o.status} />
                    {o.needs_refund && <Badge tone="red">Refund due</Badge>}
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{dateTime(o.created_at)}</Td>
                <Td>
                  {o.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" busy={act.isPending && act.variables?.reference === o.reference && act.variables.action === "confirm"} onClick={() => act.mutate({ reference: o.reference, action: "confirm" })}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => window.confirm("Decline this order?") && act.mutate({ reference: o.reference, action: "decline" })}>
                        Decline
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          <Pager page={page} count={orders.data.count} size={20} onPage={setPage} />
        </>
      )}
    </Card>
  );
}

function Attendees({ slug }: { slug: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = { search, page };
  const list = useQuery({ queryKey: ["attendees", slug, query], queryFn: () => adminApi.attendees(slug, query), placeholderData: (prev) => prev });
  return (
    <Card pad={false} actions={<SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Name, email, phone or ticket code" />}>
      {list.isPending && <Loading />}
      {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
      {list.data && !list.data.results.length && <Empty>Nobody with a confirmed ticket yet.</Empty>}
      {!!list.data?.results.length && (
        <>
          <Table head={["Name", "Ticket", "Code", "Order", "Checked in"]}>
            {list.data.results.map((a) => (
              <tr key={a.code}>
                <Td>
                  <p className="font-medium text-brand-950">{a.name}</p>
                  <p className="text-xs text-muted">{a.email}{a.phone && ` · ${a.phone}`}</p>
                </Td>
                <Td>{a.ticket_type}</Td>
                <Td className="font-mono text-xs">{a.code}</Td>
                <Td>{a.order_reference}</Td>
                <Td>{a.checked_in_at ? dateTime(a.checked_in_at) : <span className="text-muted">Not yet</span>}</Td>
              </tr>
            ))}
          </Table>
          <Pager page={page} count={list.data.count} size={20} onPage={setPage} />
        </>
      )}
    </Card>
  );
}

/** ISO → the value a datetime-local input wants, in the browser's time zone. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditEvent({ e, onSaved }: { e: Event; onSaved: (e: Event) => void }) {
  const [form, setForm] = useState({
    title: e.title,
    summary: e.summary,
    description: e.description,
    venue_name: e.venue_name,
    address: e.address,
    city: e.city,
    starts_at: toLocalInput(e.starts_at),
    ends_at: toLocalInput(e.ends_at),
  });
  const set = (k: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: ev.target.value }));
  const save = useMutation({
    mutationFn: () =>
      api<Event>(`/dashboard/events/${encodeURIComponent(e.slug)}/`, {
        method: "PATCH",
        json: { ...form, starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString() },
      }),
    onSuccess: onSaved,
  });
  const fields = save.error instanceof ApiError ? save.error.fields : {};

  return (
    <Card>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <p className="text-sm text-muted">Changing the time or place of a published event tells everyone with a ticket.</p>
        <Field label="Title" error={fields.title}><input value={form.title} onChange={set("title")} className={inputClass} /></Field>
        <Field label="Summary" error={fields.summary}><input value={form.summary} onChange={set("summary")} maxLength={200} className={inputClass} /></Field>
        <Field label="Description" error={fields.description}><textarea value={form.description} onChange={set("description")} rows={5} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Venue" error={fields.venue_name}><input value={form.venue_name} onChange={set("venue_name")} className={inputClass} /></Field>
          <Field label="Address" error={fields.address}><input value={form.address} onChange={set("address")} className={inputClass} /></Field>
          <Field label="City" error={fields.city}><input value={form.city} onChange={set("city")} className={inputClass} /></Field>
          <Field label="Starts" error={fields.starts_at}><input type="datetime-local" value={form.starts_at} onChange={set("starts_at")} className={inputClass} /></Field>
          <Field label="Ends" error={fields.ends_at}><input type="datetime-local" value={form.ends_at} onChange={set("ends_at")} className={inputClass} /></Field>
        </div>
        {save.error && !Object.keys(fields).length && <ErrorText error={save.error} />}
        <Button busy={save.isPending}>Save event</Button>
      </form>
    </Card>
  );
}
