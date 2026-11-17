import type { Metadata } from "next";
import Cars from "@/components/Cars";

export const metadata: Metadata = { title: "Cars · Shortlet Stay admin" };

export default async function Page({ searchParams }: PageProps<"/cars">) {
  const { owner } = await searchParams;
  return <Cars owner={typeof owner === "string" ? owner : ""} />;
}
