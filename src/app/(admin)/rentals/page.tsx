import type { Metadata } from "next";
import Rentals from "@/components/Rentals";

export const metadata: Metadata = { title: "Car rentals · Shortlet Stay admin" };

export default async function Page({ searchParams }: PageProps<"/rentals">) {
  const { car } = await searchParams;
  return <Rentals car={typeof car === "string" ? car : ""} />;
}
