import type { Metadata } from "next";
import Hotels from "@/components/Hotels";

export const metadata: Metadata = { title: "Hotels · Shortlet Stay admin" };

export default function Page() {
  return <Hotels />;
}
