import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Listr",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
