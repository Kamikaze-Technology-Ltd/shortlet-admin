import type { Metadata } from "next";
import UserDetail from "@/components/UserDetail";

export const metadata: Metadata = { title: "Account · Shortlet Stay admin" };

export default async function Page(props: PageProps<"/users/[id]">) {
  const { id } = await props.params;
  return <UserDetail id={Number(id)} />;
}
