import type { Metadata } from "next";
import Events from "@/components/Events";

export const metadata: Metadata = { title: "Events · Shortlet Stay admin" };

export default function Page() {
  return <Events />;
}
