"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, KeyRound, LogOut } from "lucide-react";
import { ApiError, adminApi, dateTime, day, money, moneyList, type StaffUserDetail } from "@/lib/api";
import { Badge, Button, Card, Check, Empty, ErrorText, Facts, Field, inputClass, Loading, Page, RoleBadge, StatusBadge, Table, Td, useFlash } from "./ui";

export default function UserDetail({ id }: { id: number }) {
  const user = useQuery({ queryKey: ["user", id], queryFn: () => adminApi.user(id) });
  if (user.isPending) return <Page title="Account"><Loading /></Page>;
  if (user.error) return <Page title="Account"><ErrorText error={user.error} /></Page>;
  return <Detail u={user.data} />;
}

function Detail({ u }: { u: StaffUserDetail }) {
  const queryClient = useQueryClient();
  const [flash, setFlash] = useFlash();
  const done = (data: StaffUserDetail) => {
    queryClient.setQueryData(["user", u.id], data);
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
  };
  const toggleActive = useMutation({
    mutationFn: () => adminApi.updateUser(u.id, { is_active: !u.is_active }),
    onSuccess: (data) => {
      done(data);
      setFlash(data.is_active ? "Account reactivated." : "Account deactivated and signed out everywhere.");
    },
  });
  const reset = useMutation({ mutationFn: () => adminApi.sendPasswordReset(u.id), onSuccess: (r) => setFlash(r.detail) });
  const signOut = useMutation({ mutationFn: () => adminApi.signOutUser(u.id), onSuccess: (r) => setFlash(r.detail) });

  return (
    <Page
      wide
      title={
        <span className="flex flex-wrap items-center gap-3">
          {u.name} <RoleBadge role={u.role} superuser={u.is_superuser} /> {!u.is_active && <Badge tone="red">Deactivated</Badge>}
        </span>
      }
      subtitle={
        <Link href={backLink(u)} className="inline-flex items-center gap-1 hover:text-brand-900">
          <ArrowLeft className="size-3.5" /> {u.email}
        </Link>
      }
      actions={
        <>
          <Button variant="outline" busy={reset.isPending} disabled={!u.is_active} onClick={() => reset.mutate()}>
            <KeyRound className="size-4" /> {u.has_password ? "Send password reset" : "Send set-password link"}
          </Button>
          <Button variant="outline" busy={signOut.isPending} onClick={() => window.confirm(`Sign ${u.email} out on every device?`) && signOut.mutate()}>
            <LogOut className="size-4" /> Sign out everywhere
          </Button>
          <Button
            variant={u.is_active ? "danger" : "primary"}
            busy={toggleActive.isPending}
            onClick={() =>
              (!u.is_active || window.confirm(`Deactivate ${u.email}? They'll be signed out and can't sign in until reactivated. Their bookings and payments stay on record.`)) &&
              toggleActive.mutate()
            }
          >
            {u.is_active ? <><Ban className="size-4" /> Deactivate</> : <><CheckCircle2 className="size-4" /> Reactivate</>}
          </Button>
        </>
      }
    >
      {flash}
      <ErrorText error={toggleActive.error ?? reset.error ?? signOut.error} />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <ProfileForm u={u} onSaved={(data) => { done(data); setFlash("Saved."); }} />
        <Card title="At a glance">
          <Facts
            rows={[
              ["Joined", dateTime(u.date_joined)],
              ["Last signed in", u.last_login ? dateTime(u.last_login) : "Never"],
              ["Sign-in", [u.has_password && "Password", u.google_linked && "Google"].filter(Boolean).join(" and ") || "No password set yet"],
              ["Bookings", u.booking_count],
              ["Paid for stays", moneyList(u.amount_paid)],
              ["Ticket orders", u.ticket_order_count],
              ["Reviews written", u.review_count],
              ["Support chats", u.support_chat_count],
            ]}
          />
        </Card>
      </div>

      {(u.account_type === "owner" || u.hotels.length > 0) && (
        <Card title="Hotels" pad={false}>
          {u.hotels.length ? (
            <Table head={["Hotel", "City", "Rooms", "Status"]}>
              {u.hotels.map((h) => (
                <tr key={h.id}>
                  <Td><Link href={`/hotels/${h.slug}`} className="font-medium text-brand-950 hover:underline">{h.name}</Link></Td>
                  <Td>{h.city || "—"}</Td>
                  <Td>{h.unit_count}</Td>
                  <Td>{h.is_active ? <Badge tone="green">Live</Badge> : <Badge>Hidden</Badge>}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty>No hotels yet. Give them one from a hotel&apos;s page.</Empty>
          )}
        </Card>
      )}

      {(u.account_type === "organiser" || u.events.length > 0) && (
        <Card title="Events" pad={false}>
          {u.events.length ? (
            <Table head={["Event", "Starts", "Status"]}>
              {u.events.map((e) => (
                <tr key={e.slug}>
                  <Td><Link href={`/events/${e.slug}`} className="font-medium text-brand-950 hover:underline">{e.title}</Link></Td>
                  <Td>{dateTime(e.starts_at)}</Td>
                  <Td><StatusBadge status={e.status} /></Td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty>No events yet.</Empty>
          )}
        </Card>
      )}

      <Card title="Recent bookings" pad={false} actions={u.booking_count > 10 && <span className="text-xs text-muted">Latest 10 of {u.booking_count}</span>}>
        {u.recent_bookings.length ? (
          <Table head={["Booking", "Stay", "Status", "Total", "Made"]}>
            {u.recent_bookings.map((b) => (
              <tr key={b.id}>
                <Td><span className="font-medium text-brand-950">{b.reference}</span></Td>
                <Td>
                  <p>{b.property_name} · {b.unit_name}</p>
                  <p className="text-xs text-muted">{b.stay}</p>
                </Td>
                <Td><StatusBadge status={b.status} /></Td>
                <Td>{money(b.total_price)}</Td>
                <Td className="whitespace-nowrap">{day(b.created_at)}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No bookings.</Empty>
        )}
      </Card>
    </Page>
  );
}

function backLink(u: StaffUserDetail) {
  return { guest: "/guests", owner: "/owners", organiser: "/organisers", admin: "/team" }[u.role] ?? "/users";
}

function ProfileForm({ u, onSaved }: { u: StaffUserDetail; onSaved: (u: StaffUserDetail) => void }) {
  const [form, setForm] = useState({
    first_name: u.first_name,
    last_name: u.last_name,
    phone: u.phone,
    account_type: u.account_type,
    is_staff: u.is_staff,
    is_superuser: u.is_superuser,
  });
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({ mutationFn: () => adminApi.updateUser(u.id, form), onSuccess: onSaved });
  const fields = save.error instanceof ApiError ? save.error.fields : {};

  return (
    <Card title="Profile and access">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={fields.first_name}>
            <input value={form.first_name} onChange={(e) => set("first_name")(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Last name" error={fields.last_name}>
            <input value={form.last_name} onChange={(e) => set("last_name")(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Phone" error={fields.phone}>
            <input value={form.phone} onChange={(e) => set("phone")(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Account type" error={fields.account_type} hint="Owners run hotels; organisers sell event tickets.">
            <select value={form.account_type} onChange={(e) => set("account_type")(e.target.value as typeof form.account_type)} className={inputClass}>
              <option value="guest">Guest</option>
              <option value="owner">Hotel owner</option>
              <option value="organiser">Event organiser</option>
            </select>
          </Field>
        </div>
        <div className="space-y-2 rounded-2xl bg-cream/60 p-4">
          <Check label="Shortlet Stay staff (can use this admin)" checked={form.is_staff} onChange={(v) => setForm((f) => ({ ...f, is_staff: v, is_superuser: v && f.is_superuser }))} />
          <Check label="Super admin (can manage the support team)" checked={form.is_superuser} disabled={!form.is_staff} onChange={set("is_superuser")} />
          <p className="text-xs text-muted">Only super admins can change these.</p>
        </div>
        {save.error && !Object.keys(fields).length && <ErrorText error={save.error} />}
        <Button busy={save.isPending}>Save changes</Button>
      </form>
    </Card>
  );
}
