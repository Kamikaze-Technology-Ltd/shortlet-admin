import type { Metadata } from "next";
import Amenities from "@/components/Amenities";

export const metadata: Metadata = { title: "Amenities · Shortlet Stay admin" };

export default function Page() {
  return <Amenities />;
}
