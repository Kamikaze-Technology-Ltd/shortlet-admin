import Shell from "@/components/Shell";

/** Every page behind the staff sign-in shares the sidebar. */
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return <Shell>{children}</Shell>;
}
