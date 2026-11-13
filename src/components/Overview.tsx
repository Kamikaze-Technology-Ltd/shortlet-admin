"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminApi, dateTime, money, moneyList, type Overview as Data } from "@/lib/api";
import { Card, ErrorText, Loading, Page, RoleBadge, Stat, StatusBadge, Table, Td } from "./ui";

/** The whole platform at a glance. */
export default function Overview() {
  const q = useQuery({ queryKey: ["overview"], queryFn: adminApi.overview, refetchInterval: 60_000 });
  if (q.isPending) return <Page title="Overview"><Loading /></Page>;
  if (q.error) return <Page title="Overview"><ErrorText error={q.error} /></Page>;
  const d = q.data;

  return (
    <Page title="Overview" subtitle="Everything happening on Shortlet Stay." wide>
      <Attention d={d} />

      <Section title="Money">
        <Stat label="Booking takings" value={moneyList(d.money.bookings)} hint={`${moneyList(d.money.bookings_30d)} in the last 30 days`} />
        <Stat label="Ticket takings" value={moneyList(d.money.tickets)} hint={`${moneyList(d.money.tickets_30d)} in the last 30 days`} />
        <Stat label="Awaiting refund" value={d.money.needs_refund} tone={d.money.needs_refund ? "warn" : undefined} hint="Booking and ticket payments" />
        <Stat label="Failed payments" value={d.money.failed_30d} hint="Last 30 days" />
      </Section>

      <Section title="Stays">
        <Stat label="Hotels" value={d.hotels.total} hint={`${d.hotels.active} live · ${d.hotels.without_owner} without an owner`} />
        <Stat label="Rooms" value={d.hotels.rooms} hint={`${d.hotels.rooms_published} published`} />
        <Stat label="Bookings" value={d.bookings.total} hint={`${d.bookings.new_30d} new in 30 days · ${d.bookings.cancelled_30d} cancelled`} />
        <Stat label="Staying now" value={d.bookings.in_house} hint={`${d.bookings.upcoming} confirmed upcoming · ${d.bookings.pending} pending`} />
      </Section>

      <Section title="People">
        <Stat label="Accounts" value={d.users.total} hint={`${d.users.new_30d} joined in 30 days · ${d.users.inactive} deactivated`} />
        <Stat label="Guests" value={d.users.guests} />
        <Stat label="Hotel owners" value={d.users.owners} hint={`${d.users.organisers} event organisers`} />
        <Stat label="Support team" value={d.users.staff} />
      </Section>

      <Section title="Quality and events">
        <Stat
          label="Reviews"
          value={d.reviews.total}
          hint={`Hotels ${d.reviews.hotel_average ?? "—"}★ · rooms ${d.reviews.room_average ?? "—"}★ · ${d.reviews.hidden} hidden`}
        />
        <Stat label="Support chats open" value={d.support.open} hint={`${d.support.needs_reply} need a reply · ${d.support.unassigned} unassigned`} />
        <Stat label="Upcoming events" value={d.events.upcoming} hint={`${d.events.drafts} drafts`} />
        <Stat label="Tickets sold" value={d.events.tickets_sold} />
      </Section>

      <Card title="Last six months">
        <Months months={d.months} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card title="Latest bookings" actions={<Link href="/bookings" className="text-sm font-medium text-brand-900 hover:underline">All bookings</Link>} pad={false}>
          <Table head={["Booking", "Stay", "Status", "Total"]}>
            {d.recent_bookings.map((b) => (
              <tr key={b.id}>
                <Td>
                  <p className="font-medium text-brand-950">{b.guest_name}</p>
                  <p className="text-xs text-muted">{b.reference} · {dateTime(b.created_at)}</p>
                </Td>
                <Td>
                  <p>{b.property_name} · {b.unit_name}</p>
                  <p className="text-xs text-muted">{b.stay}</p>
                </Td>
                <Td><StatusBadge status={b.status} /></Td>
                <Td>{money(b.total_price)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Newest accounts" actions={<Link href="/users" className="text-sm font-medium text-brand-900 hover:underline">All users</Link>}>
          <ul className="divide-y divide-brand-900/5">
            {d.recent_users.map((u) => (
              <li key={u.id}>
                <Link href={`/users/${u.id}`} className="flex items-center gap-3 py-2.5 hover:bg-mist">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-brand-950">{u.name || u.email}</p>
                    <p className="truncate text-xs text-muted">{u.email} · {dateTime(u.date_joined)}</p>
                  </div>
                  <RoleBadge role={u.role} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

/** What needs someone's attention today. */
function Attention({ d }: { d: Data }) {
  const items = [
    d.support.needs_reply && { href: "/support", text: `${d.support.needs_reply} support chat${d.support.needs_reply === 1 ? "" : "s"} waiting for a reply` },
    d.money.needs_refund && { href: "/payments", text: `${d.money.needs_refund} payment${d.money.needs_refund === 1 ? "" : "s"} to refund` },
    d.bookings.pending && { href: "/bookings", text: `${d.bookings.pending} booking${d.bookings.pending === 1 ? "" : "s"} pending` },
    d.hotels.without_owner && { href: "/hotels", text: `${d.hotels.without_owner} hotel${d.hotels.without_owner === 1 ? "" : "s"} managed by Shortlet Stay (no owner)` },
  ].filter(Boolean) as { href: string; text: string }[];
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="rounded-full bg-gold-300/40 px-4 py-2 text-sm font-medium text-brand-950 hover:bg-gold-300/70">
          {i.text} →
        </Link>
      ))}
    </div>
  );
}

/** Bookings and sign-ups per month, as paired bars. */
function Months({ months }: { months: Data["months"] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.bookings, m.signups]));
  return (
    <div>
      <div className="flex h-44 items-end gap-3 sm:gap-6">
        {months.map((m) => (
          <div key={m.month} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex flex-1 items-end justify-center gap-1">
              <Bar value={m.bookings} max={max} className="bg-brand-900" label={`${m.bookings} bookings`} />
              <Bar value={m.signups} max={max} className="bg-gold-400" label={`${m.signups} sign-ups`} />
            </div>
            <p className="mt-2 text-center text-xs text-muted">{new Date(m.month).toLocaleDateString("en-GB", { month: "short" })}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-900" /> Bookings made</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-gold-400" /> New accounts</span>
      </div>
    </div>
  );
}

function Bar({ value, max, className, label }: { value: number; max: number; className: string; label: string }) {
  return (
    <div className="flex h-full w-full max-w-8 flex-col justify-end" title={label}>
      <span className="mb-1 text-center text-[0.65rem] text-muted">{value || ""}</span>
      <div className={`w-full rounded-t-md ${className}`} style={{ height: `${(value / max) * 85}%`, minHeight: value ? 4 : 0 }} />
    </div>
  );
}
