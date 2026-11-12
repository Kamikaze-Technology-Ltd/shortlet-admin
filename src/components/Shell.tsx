"use client";

import { useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Inbox, Loader2, LogOut, MessageSquareText } from "lucide-react";
import { authApi, supportApi } from "@/lib/api";

const NAV = [
  { href: "/", label: "Support inbox", icon: Inbox },
  { href: "/topics", label: "Help bot answers", icon: MessageSquareText },
];
const noSubscribe = () => () => {};

/** Signed-in frame: sends anyone without a staff session to /login. */
export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasSession = useSyncExternalStore(noSubscribe, authApi.signedIn, () => null);
  const me = useQuery({ queryKey: ["me"], queryFn: authApi.me, enabled: hasSession === true, retry: false });
  const summary = useQuery({ queryKey: ["summary"], queryFn: supportApi.summary, enabled: me.data?.role === "admin", refetchInterval: 15_000 });

  const allowed = me.data?.role === "admin";
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

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 items-center gap-2 bg-brand-950 px-4 py-3 text-white lg:w-60 lg:flex-col lg:items-stretch lg:gap-1 lg:p-4">
        <Image src="/logo-light.png" alt="Shortlet Stay" width={847} height={155} className="mr-2 h-6 w-auto lg:mb-1 lg:mr-0 lg:h-7" priority />
        <p className="hidden text-xs uppercase tracking-[0.15em] text-white/50 lg:mb-5 lg:block">Admin</p>
        <nav className="flex flex-1 gap-1 lg:flex-col">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${on ? "bg-white text-brand-950" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
                {href === "/" && !!summary.data?.needs_reply && (
                  <span className="ml-auto rounded-full bg-gold-400 px-2 text-xs font-semibold text-brand-950">{summary.data.needs_reply}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="hidden text-xs text-white/50 lg:block">{me.data?.email}</div>
        <button
          onClick={() => {
            authApi.logout();
            router.replace("/login");
          }}
          className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
        </button>
      </aside>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
