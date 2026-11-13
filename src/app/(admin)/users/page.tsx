import type { Metadata } from "next";
import Users from "@/components/Users";

export const metadata: Metadata = { title: "All users · Shortlet Stay admin" };

export default function Page() {
  return <Users />;
}
