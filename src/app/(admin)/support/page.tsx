import type { Metadata } from "next";
import Inbox from "@/components/Inbox";

export const metadata: Metadata = { title: "Support inbox · Shortlet Stay admin" };

export default function InboxPage() {
  return <Inbox />;
}
