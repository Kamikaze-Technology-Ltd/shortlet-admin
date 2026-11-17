import type { Metadata } from "next";
import Users from "@/components/Users";

export const metadata: Metadata = { title: "Car rental accounts · Shortlet Stay admin" };

export default function Page() {
  return <Users role="car_rental" />;
}
