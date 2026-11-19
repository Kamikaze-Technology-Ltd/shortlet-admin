import type { Metadata } from "next";
import Charters from "@/components/Charters";

export const metadata: Metadata = { title: "Boat cruises · Shortlet Stay admin" };

export default async function Page({ searchParams }: PageProps<"/charters">) {
  const { boat } = await searchParams;
  return <Charters boat={typeof boat === "string" ? boat : ""} />;
}
