import type { Metadata } from "next";
import Overview from "@/components/Overview";

export const metadata: Metadata = { title: "Overview · Shortlet Stay admin" };

export default function Page() {
  return <Overview />;
}
