"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { adminApi, dateTime, day, money } from "@/lib/api";
import { Badge, Card, Empty, ErrorText, Loading, Page, Pager, SearchBox, Select, StatusBadge, Table, Tabs, Td, Toolbar } from "./ui";

const PAGE_SIZE = 25;

export default function Events() {
  const [tab, setTab] = useState<"events" | "orders">("events");
  return (
    <Page title="Events" subtitle="Events organisers sell tickets for, and every ticket order." wide>
      <Tabs value={tab} onChange={setTab} options={[["events", "Events"], ["orders", "Ticket orders"]] as const} />
      {tab === "events" ? <EventList /> : <OrderList />}
    </Page>
  );
}

function EventList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const query = { search, status, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["events", query], queryFn: () => adminApi.events(query), placeholderData: (prev) => prev });

  return (
    <>
      <Toolbar>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Title, venue or city" />
        <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[["", "Any status"], ["published", "Published"], ["draft", "Draft"], ["cancelled", "Cancelled"]] as const} />
      </Toolbar>
      <Card pad={false}>
        {list.isPending && <Loading />}
        {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
        {list.data && !list.data.results.length && <Empty>No events match.</Empty>}
        {!!list.data?.results.length && (
          <>
            <Table head={["Event", "When", "Organiser", "Sold", "Revenue", "Status"]}>
              {list.data.results.map((e) => (
                <tr key={e.slug} className="cursor-pointer hover:bg-mist" onClick={() => router.push(`/events/${e.slug}`)}>
                  <Td>
                    <Link href={`/events/${e.slug}`} onClick={(ev) => ev.stopPropagation()} className="font-medium text-brand-950 hover:underline">{e.title}</Link>
                    <p className="text-xs text-muted">{e.venue_name}, {e.city}</p>
                  </Td>
                  <Td className="whitespace-nowrap">{dateTime(e.starts_at)}</Td>
                  <Td>{e.organiser_email ?? <Badge tone="blue">Shortlet Stay</Badge>}</Td>
                  <Td>{e.stats.sold} / {e.stats.capacity}</Td>
                  <Td>{money(e.stats.revenue)}</Td>
                  <Td><StatusBadge status={e.status} /></Td>
                </tr>
              ))}
            </Table>
            <Pager page={page} count={list.data.count} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}

function OrderList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const query = { search, status, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["ticket-orders", query], queryFn: () => adminApi.ticketOrders(query), placeholderData: (prev) => prev });

  return (
    <>
      <Toolbar>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Order reference, buyer name, email or phone" />
        <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[["", "Any status"], ["pending", "Pending"], ["confirmed", "Confirmed"], ["cancelled", "Cancelled"]] as const} />
      </Toolbar>
      <Card pad={false}>
        {list.isPending && <Loading />}
        {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
        {list.data && !list.data.results.length && <Empty>No orders match.</Empty>}
        {!!list.data?.results.length && (
          <>
            <Table head={["Buyer", "Event", "Tickets", "Total", "Status", "Ordered"]}>
              {list.data.results.map((o) => (
                <tr key={o.reference}>
                  <Td>
                    <p className="font-medium text-brand-950">{o.buyer_name}</p>
                    <p className="text-xs text-muted">{o.buyer_email}{o.buyer_phone && ` · ${o.buyer_phone}`}</p>
                  </Td>
                  <Td>
                    <Link href={`/events/${o.event_slug}`} className="text-brand-900 hover:underline">{o.event_title}</Link>
                    <p className="text-xs text-muted">{o.reference}</p>
                  </Td>
                  <Td>{o.tickets.length}</Td>
                  <Td>{money(o.total_price, o.currency)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={o.status} />
                      {o.needs_refund && <Badge tone="red">Refund due</Badge>}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">{day(o.created_at)}</Td>
                </tr>
              ))}
            </Table>
            <Pager page={page} count={list.data.count} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
