import type { Metadata } from "next";
import Shell from "@/components/Shell";
import Topics from "@/components/Topics";

export const metadata: Metadata = { title: "Help bot answers · Shortlet Stay admin" };

export default function TopicsPage() {
  return (
    <Shell>
      <Topics />
    </Shell>
  );
}
