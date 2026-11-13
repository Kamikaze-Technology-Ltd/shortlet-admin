import type { Metadata } from "next";
import { Suspense } from "react";
import Reviews from "@/components/Reviews";

export const metadata: Metadata = { title: "Reviews · Shortlet Stay admin" };

export default function Page() {
  return (
    <Suspense>
      <Reviews />
    </Suspense>
  );
}
