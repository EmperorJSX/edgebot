import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "edgebot | autonomous value-betting agent",
  description: "Autonomous value-betting agent dashboard (demo)",
  icons: { icon: "/brand/logo-icon.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
