import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { WalletProviders } from "@/components/WalletProviders";
import dynamic from "next/dynamic";

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

// ── Navbar ────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0]"
         style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-[#E8315A] rounded-lg flex items-center justify-center flex-shrink-0
                          group-hover:bg-[#C41E45] transition-colors">
            <span className="text-white text-base leading-none">🎟</span>
          </div>
          <span className="text-lg font-bold text-[#0F172A] tracking-tight">
            Ticket<span className="text-[#E8315A]">Mint</span>
          </span>
        </a>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-1 text-sm font-medium">
          {[
            { href: "/",            label: "Browse" },
            { href: "/my-tickets",  label: "My Tickets" },
            { href: "/list-ticket", label: "Sell Tickets" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-4 py-2 rounded-lg text-[#334155] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Wallet button */}
        <NavWallet />
      </div>
    </nav>
  );
}

const NavWallet = dynamic(
  () => import("@/components/WalletButton").then((m) => m.WalletButton),
  {
    ssr: false,
    loading: () => (
      <div className="h-9 w-36 rounded-lg bg-[#F1F5F9] animate-pulse" />
    ),
  }
);

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

          <div className="flex items-center gap-5 text-sm text-[#64748B]">
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
