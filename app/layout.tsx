import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShowPing — Booking Tracker",
  description: "Track a movie, theatre and date, then get notified when booking opens.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
