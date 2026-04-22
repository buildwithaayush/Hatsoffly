import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { EnvironmentBanner } from "@/components/environment-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hatsoffly — More Google reviews, automatically",
  description:
    "Hatsoffly sends timely SMS review requests, routes happy customers to Google, and catches unhappy feedback privately — built for local service teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <EnvironmentBanner />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
