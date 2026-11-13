"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, dateTime, day, money, type TicketPayment, type Transaction } from "@/lib/api";
import { Badge, Button, Card, Drawer, Empty, ErrorText, Facts, Field, inputClass, Loading, Page, Pager, SearchBox, Select, Stat, StatusBadge, Table, Tabs, Td, Toolbar } from "./ui";

const PAGE_SIZE = 25;

export default function Payments() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"bookings" | "tickets">("bookings");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [status, setStatus] = useState("");
  const [refund, setRefund] = useState<"" | "true">("");
  const [page, setPage] = useState(1);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const filters = { search, status, needs_refund: refund };

  return (
    <Page title="Payments" subtitle="Card and bank payments through Flutterwave, for stays and event tickets." wide>
      <Toolbar>
        <Tabs value={tab} onChange={reset(setTab)} options={[["bookings", "Stays"], ["tickets", "Event tickets"]] as const} />
        <SearchBox key={tab} value={search} onChange={reset(setSearch)} placeholder="Payment or booking reference, name or email" />
        <Select label="Status" value={status} onChange={reset(setStatus)} options={[["", "Any status"], ["successful", "Successful"], ["failed", "Failed"], ["initiated", "Not completed"]] as const} />
        <Select label="Refunds" value={refund} onChange={reset(setRefund)} options={[["", "All payments"], ["true", "Waiting for a refund"]] as const} />
      </Toolbar>
      {tab === "bookings" ? <BookingPayments filters={filters} page={page} setPage={setPage} /> : <TicketPayments filters={filters} page={page} setPage={setPage} />}
    </Page>
  );
}

type ListProps = { filters: { search: string; status: string; needs_refund: string }; page: number; setPage: (p: number) => void };

function BookingPayments({ filters, page, setPage }: ListProps) {
  const [open, setOpen] = useState<Transaction | null>(null);
  const query = { ...filters, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["transactions", query], queryFn: () => adminApi.transactions(query), placeholderData: (prev) => prev });
  const summary = useQuery({ queryKey: ["transactions-summary", filters], queryFn: () => adminApi.transactionSummary(filters) });

  return (
    <>
      {summary.data && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Received" value={money(summary.data.received)} hint="Successful, less refunds due" tone="good" />
          <Stat label="Successful" value={summary.data.successful} />
          <Stat label="Failed" value={summary.data.failed} />
          <Stat label="Not completed" value={summary.data.not_completed} />
          <Stat label="To refund" value={summary.data.needs_refund} tone={summary.data.needs_refund ? "warn" : undefined} />
        </div>
      )}
      <Card pad={false}>
        {list.isPending && <Loading />}
        {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
        {list.data && !list.data.results.length && <Empty>No payments match.</Empty>}
        {!!list.data?.results.length && (
          <>
            <Table head={["Guest", "Booking", "Amount", "Method", "Status", "Date"]}>
              {list.data.results.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-mist" onClick={() => setOpen(p)}>
                  <Td>
                    <p className="font-medium text-brand-950">{p.guest_name}</p>
                    <p className="text-xs text-muted">{p.guest_email}</p>
                  </Td>
                  <Td>
                    <p>{p.booking_reference} · {p.hotel_name}</p>
                    <p className="text-xs text-muted">{p.stay}</p>
                  </Td>
                  <Td className="whitespace-nowrap">{money(p.amount, p.currency)}</Td>
                  <Td>{p.payment_type || "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={p.status} />
                      {p.needs_refund && <Badge tone="red">Refund due</Badge>}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">{day(p.paid_at ?? p.created_at)}</Td>
                </tr>
              ))}
            </Table>
            <Pager page={page} count={list.data.count} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>
      {open && <TransactionDrawer payment={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}

function TransactionDrawer({ payment: p, onChange, onClose }: { payment: Transaction; onChange: (p: Transaction) => void; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const refund = useMutation({
    mutationFn: () => adminApi.markRefunded(p.id, note),
    onSuccess: (updated) => {
      onChange(updated);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-summary"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  return (
    <Drawer title={<span className="flex items-center gap-2">{p.tx_ref} <StatusBadge status={p.status} /></span>} onClose={onClose}>
      {p.needs_refund && (
        <div className="space-y-3 rounded-2xl bg-red-50 p-4 text-sm text-red-900">
          <p>The guest paid, but the booking couldn&apos;t be confirmed (its time was taken while they paid). Refund them through Flutterwave or by bank transfer, then record it here.</p>
          <Field label="Refund note">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Flutterwave refund ID or bank reference" className={inputClass} />
          </Field>
          <ErrorText error={refund.error} />
          <Button busy={refund.isPending} onClick={() => refund.mutate()}>Mark as refunded</Button>
        </div>
      )}
      <Facts
        rows={[
          ["Amount", money(p.amount, p.currency)],
          ["Guest", `${p.guest_name} · ${p.guest_email}`],
          ["Booking", <Link key="b" href={`/bookings?search=${p.booking_reference}`} className="font-medium text-brand-900 hover:underline">{p.booking_reference}</Link>],
          ["Hotel", `${p.hotel_name} · ${p.room_name}`],
          ["Stay", p.stay],
          ["Method", p.payment_type || "—"],
          ["Paid", dateTime(p.paid_at)],
          ["Started", dateTime(p.created_at)],
          ["Flutterwave ID", p.provider_transaction_id || "—"],
          ["Flutterwave ref", p.provider_ref || "—"],
        ]}
      />
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">Timeline</h3>
        <ol className="space-y-2 border-l-2 border-brand-900/10 pl-4">
          {p.events.map((e, i) => (
            <li key={i} className="text-sm">
              <p className="font-medium text-brand-950">{e.label}</p>
              {e.message && <p className="text-muted">{e.message}</p>}
              <p className="text-xs text-muted">{dateTime(e.created_at)}</p>
            </li>
          ))}
          {!p.events.length && <li className="text-sm text-muted">Nothing recorded.</li>}
        </ol>
      </section>
    </Drawer>
  );
}

function TicketPayments({ filters, page, setPage }: ListProps) {
  const queryClient = useQueryClient();
  const query = { ...filters, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["ticket-payments", query], queryFn: () => adminApi.ticketPayments(query), placeholderData: (prev) => prev });
  const refund = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => adminApi.markTicketRefunded(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-payments"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
  const markRefunded = (p: TicketPayment) => {
    const note = window.prompt(`Refunded ${money(p.amount, p.currency)} to ${p.buyer_name}? Add a note (e.g. the bank reference), or leave it empty.`);
    if (note !== null) refund.mutate({ id: p.id, note });
  };

  return (
    <Card pad={false}>
      {list.isPending && <Loading />}
      {(list.error || refund.error) && <div className="p-4"><ErrorText error={list.error ?? refund.error} /></div>}
      {list.data && !list.data.results.length && <Empty>No payments match.</Empty>}
      {!!list.data?.results.length && (
        <>
          <Table head={["Buyer", "Event", "Amount", "Method", "Status", "Date", ""]}>
            {list.data.results.map((p) => (
              <tr key={p.id}>
                <Td>
                  <p className="font-medium text-brand-950">{p.buyer_name}</p>
                  <p className="text-xs text-muted">{p.buyer_email}</p>
                </Td>
                <Td>
                  <p>{p.event_title}</p>
                  <p className="text-xs text-muted">{p.order_reference} · {p.tx_ref}</p>
                </Td>
                <Td className="whitespace-nowrap">{money(p.amount, p.currency)}</Td>
                <Td>{p.payment_type || "—"}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={p.status} />
                    {p.needs_refund && <Badge tone="red">Refund due</Badge>}
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{day(p.paid_at ?? p.created_at)}</Td>
                <Td>
                  {p.needs_refund && (
                    <Button size="sm" variant="outline" busy={refund.isPending && refund.variables?.id === p.id} onClick={() => markRefunded(p)}>
                      Mark refunded
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          <Pager page={page} count={list.data.count} size={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </Card>
  );
}
