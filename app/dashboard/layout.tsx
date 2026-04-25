import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={`${jakarta.className} min-h-full`}>{children}</div>;
}
