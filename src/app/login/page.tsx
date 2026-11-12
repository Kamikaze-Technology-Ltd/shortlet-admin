"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ApiError, authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setError("");
          setLoading(true);
          try {
            await authApi.login(String(form.get("email")), String(form.get("password")));
            router.replace("/");
          } catch (err) {
            setError(err instanceof ApiError && err.status === 401 ? "Incorrect email or password." : err instanceof Error ? err.message : "Couldn't sign in.");
            setLoading(false);
          }
        }}
        className="w-full max-w-sm space-y-4 rounded-[2rem] bg-white p-8 shadow-xl shadow-brand-950/5"
      >
        <Image src="/logo.png" alt="Shortlet Stay" width={847} height={155} className="h-7 w-auto" priority />
        <div>
          <h1 className="font-display text-3xl text-brand-950">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">For Shortlet Stay staff.</p>
        </div>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <label className="block text-sm font-medium text-brand-900">
          Email
          <input name="email" type="email" autoComplete="email" required className="mt-1 h-11 w-full rounded-xl border border-brand-900/15 px-3 outline-none focus:border-gold-500" />
        </label>
        <label className="block text-sm font-medium text-brand-900">
          Password
          <input name="password" type="password" autoComplete="current-password" required className="mt-1 h-11 w-full rounded-xl border border-brand-900/15 px-3 outline-none focus:border-gold-500" />
        </label>
        <button disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-950 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
          {loading && <Loader2 className="size-4 animate-spin" />} Sign in
        </button>
      </form>
    </div>
  );
}
