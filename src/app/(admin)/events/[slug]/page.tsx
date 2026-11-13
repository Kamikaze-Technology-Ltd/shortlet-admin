import type { Metadata } from "next";
import EventDetail from "@/components/EventDetail";

export const metadata: Metadata = { title: "Event · Shortlet Stay admin" };

export default async function Page(props: PageProps<"/events/[slug]">) {
  const { slug } = await props.params;
  return <EventDetail slug={slug} />;
}
