"use client";

import { useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  CreditCard,
  Hotel,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquareText,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { adminApi, authApi, supportApi } from "@/lib/api";

type Badge = "support" | "refunds";
const NAV: { section?: string; items: { href: string; label: string; icon: typeof Inbox; badge?: Badge }[] }[] = [
  { items: [{ href: "/", label: "Overview", icon: LayoutDashboard }] },
  {
    section: "People",
    items: [
      { href: "/users", label: "All users", icon: Users },
      { href: "/guests", label: "Guests", icon: UserRound },
      { href: "/owners", label: "Hotel owners", icon: Building2 },
      { href: "/organisers", label: "Organisers", icon: Ticket },
      { href: "/team", label: "Support team", icon: ShieldCheck },
    ],
  },
  {
    section: "Stays",
    items: [
      { href: "/hotels", label: "Hotels & rooms", icon: Hotel },
      { href: "/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/payments", label: "Payments", icon: CreditCard, badge: "refunds" },
      { href: "/reviews", label: "Reviews", icon: Star },
      { href: "/events", label: "Events", icon: PartyPopper },
      { href: "/amenities", label: "Amenities", icon: Sparkles },
    ],
  },
  {
    section: "Support",
    items: [
      { href: "/support", label: "Support inbox", icon: Inbox, badge: "support" },
      { href: "/topics", label: "Help bot answers", icon: MessageSquareText },
    ],
  },
];
const noSubscribe = () => () => {};

/** Signed-in frame: sends anyone without a staff session to /login. */
export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasSession = useSyncExternalStore(noSubscribe, authApi.signedIn, () => null);
  const me = useQuery({ queryKey: ["me"], queryFn: authApi.me, enabled: hasSession === true, retry: false });
  const allowed = me.data?.role === "admin";
  const summary = useQuery({ queryKey: ["summary"], queryFn: supportApi.summary, enabled: allowed, refetchInterval: 15_000 });
  const overview = useQuery({ queryKey: ["overview"], queryFn: adminApi.overview, enabled: allowed, refetchInterval: 60_000 });

  useEffect(() => {
    if (hasSession === false || me.isError || (me.data && !allowed)) {
      authApi.logout();
      router.replace("/login");
    }
  }, [hasSession, me.isError, me.data, allowed, router]);

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-brand-900" aria-label="Loading" />
      </div>
    );
  }

  const counts: Record<Badge, number> = { support: summary.data?.needs_reply ?? 0, refunds: overview.data?.money.needs_refund ?? 0 };

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 items-center gap-2 bg-brand-950 px-4 py-3 text-white lg:w-64 lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-y-auto lg:p-4">
        <Image src="/logo-light.png" alt="Shortlet Stay" width={847} height={155} className="mr-2 h-6 w-auto lg:mb-1 lg:mr-0 lg:h-7" priority />
        <p className="hidden text-xs uppercase tracking-[0.15em] text-white/50 lg:mb-4 lg:block">Admin</p>
        <nav className="flex flex-1 gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV.map((group, i) => (
            <div key={i} className="flex gap-1 lg:mb-3 lg:flex-col">
              {group.section && <p className="hidden px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/40 lg:block">{group.section}</p>}
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const on = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
                const count = badge ? counts[badge] : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    aria-current={on ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${on ? "bg-white text-brand-950" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                  >
                    <Icon className="size-4" />
                    <span className="hidden lg:inline">{label}</span>
                    {!!count && <span className="ml-auto rounded-full bg-gold-400 px-2 text-xs font-semibold text-brand-950">{count}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="hidden truncate px-3 text-xs text-white/50 lg:block">
          {me.data?.email}
        </div>
        <button
          onClick={() => {
            authApi.logout();
            router.replace("/login");
          }}
          className="flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" /> <span className="hidden lg:inline">Sign out</span>
        </button>
      </aside>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
