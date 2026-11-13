import type { Metadata } from "next";
import { Suspense } from "react";
import Bookings from "@/components/Bookings";

export const metadata: Metadata = { title: "Bookings · Shortlet Stay admin" };

export default function Page() {
  return (
    <Suspense>
      <Bookings />
    </Suspense>
  );
}
