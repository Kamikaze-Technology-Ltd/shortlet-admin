import type { Metadata } from "next";
import HotelDetail from "@/components/HotelDetail";

export const metadata: Metadata = { title: "Add a hotel · Shortlet Stay admin" };

export default function Page() {
  return <HotelDetail slug={null} />;
}
