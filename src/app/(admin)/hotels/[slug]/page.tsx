import type { Metadata } from "next";
import HotelDetail from "@/components/HotelDetail";

export const metadata: Metadata = { title: "Hotel · Shortlet Stay admin" };

export default async function Page(props: PageProps<"/hotels/[slug]">) {
  const { slug } = await props.params;
  return <HotelDetail slug={slug} />;
}
