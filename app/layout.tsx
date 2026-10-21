import type { Metadata, Viewport } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const display = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-lilita", display: "swap" });
const body = Nunito({ weight: ["600", "700", "800", "900"], subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "NEARLIFE",
  description: "A shared 3D life-sim neighborhood where players earn, spend and trade NEP-245 tokens on NEAR.",
  appleWebApp: { capable: true, title: "NEARLIFE", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2443c9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
