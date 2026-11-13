import type { Metadata } from "next";
import { Suspense } from "react";
import Payments from "@/components/Payments";

export const metadata: Metadata = { title: "Payments · Shortlet Stay admin" };

export default function Page() {
  return (
    <Suspense>
      <Payments />
    </Suspense>
  );
}
