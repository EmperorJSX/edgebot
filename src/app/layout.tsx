import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Favicon comes from the app icon file convention: src/app/icon.png (the brand
// icon). Next serves and links it automatically; no manual icons entry needed.
export const metadata: Metadata = {
  title: "edgebot | autonomous value-betting agent",
  description:
    "Autonomous value-betting agent: TxLINE consensus odds, de-vig, edge detection, fractional Kelly staking, and a live decision log.",
  applicationName: "edgebot",
};

// Runs before paint: apply the stored theme, else follow the OS preference.
const themeInit = `try{var t=localStorage.getItem("edgebot-theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
