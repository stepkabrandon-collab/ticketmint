import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { WalletProviders } from "@/components/WalletProviders";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Ticket Mint — Buy & Sell Event Tickets",
    template: "%s | Ticket Mint",
  },
  description:
    "The smarter way to buy, sell, and resell event tickets. Guaranteed authentic, instant delivery, zero double-selling.",
  keywords: ["tickets", "events", "marketplace", "concert", "sports", "resale"],
  openGraph: {
    title: "Ticket Mint — Buy & Sell Event Tickets",
    description: "Guaranteed authentic tickets. Instant delivery. Best prices.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#F8F9FA] text-[#0F172A] antialiased">
        <WalletProviders>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
          <Footer />
        </WalletProviders>

        <Toaster
          theme="light"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              color: "#0F172A",
              boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}

// ── Footer ────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] mt-16 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#E8315A] rounded-md flex items-center justify-center">
              <span className="text-white text-sm">🎟</span>
            </div>
            <span className="font-bold text-[#0F172A]">
              Ticket<span className="text-[#E8315A]">Mint</span>
            </span>
          </div>

          <p className="text-sm text-[#64748B] text-center">
            © {new Date().getFullYear()} TicketMint. All tickets are verified &amp; guaranteed.
          </p>

          <div className="flex flex-wrap items-center gap-5 text-sm text-[#64748B] justify-center">
            <a href="/guarantee" className="hover:text-[#E8315A] transition-colors">
              Buyer Guarantee
            </a>
            <span className="text-[#CBD5E1]">|</span>
            <a
              href="https://solscan.io/?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E8315A] transition-colors"
            >
              Verify a ticket ↗
            </a>
            <span className="text-[#CBD5E1]">|</span>
            <span>Secured by blockchain</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
