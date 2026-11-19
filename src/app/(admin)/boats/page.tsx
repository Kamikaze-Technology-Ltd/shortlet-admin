import type { Metadata } from "next";
import Boats from "@/components/Boats";

export const metadata: Metadata = { title: "Boats · Shortlet Stay admin" };

export default async function Page({ searchParams }: PageProps<"/boats">) {
  const { owner } = await searchParams;
  return <Boats owner={typeof owner === "string" ? owner : ""} />;
}
