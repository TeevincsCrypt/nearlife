import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "NEARLIFE",
  description: "A shared life-sim neighborhood where players and autonomous NPC agents earn, spend and trade NEP-245 tokens on NEAR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Providers>
          <NavBar />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <footer className="text-muted-foreground mx-auto max-w-7xl px-4 pb-8 text-xs">
            NEARLIFE · NEAR Hackathon 2026 · Games With Real Economies · Privy social login · NEP-245 multi-token ledger · autonomous NPC agents
          </footer>
        </Providers>
      </body>
    </html>
  );
}
