import type { Metadata } from "next";
import Users from "@/components/Users";

export const metadata: Metadata = { title: "Organisers · Shortlet Stay admin" };

export default function Page() {
  return <Users role="organiser" />;
}
