import type { Metadata } from "next";
import Users from "@/components/Users";

export const metadata: Metadata = { title: "Support team · Shortlet Stay admin" };

export default function Page() {
  return <Users role="admin" />;
}
