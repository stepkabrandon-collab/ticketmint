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
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16" style={{ background: "#0F172A" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        {/* Main grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <a href="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 bg-[#E8315A] rounded-xl flex items-center justify-center
                              group-hover:bg-[#C41E45] transition-colors">
                <span className="text-white text-lg">🎟</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Ticket<span className="text-[#E8315A]">Mint</span>
              </span>
            </a>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              The smarter way to buy, sell, and resell event tickets. Verified and instant.
            </p>
            {/* Social placeholders */}
            <div className="flex gap-3">
              {["𝕏", "📸", "▶"].map((icon, i) => (
                <div key={i} className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center
                                        text-white/60 text-sm hover:bg-white/20 hover:text-white
                                        transition-colors cursor-pointer">
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Marketplace</h4>
            <ul className="space-y-3">
              {[
                { href: "/",            label: "Browse Events" },
                { href: "/list-ticket", label: "Sell Tickets" },
                { href: "/my-tickets",  label: "My Tickets" },
                { href: "/#how-it-works", label: "How It Works" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Support</h4>
            <ul className="space-y-3">
              {[
                { href: "/guarantee", label: "Buyer Guarantee" },
                { href: "/guarantee#faq", label: "FAQ" },
                { href: "mailto:support@ticketmint.io", label: "Contact Us" },
                { href: "https://solscan.io/?cluster=devnet", label: "Verify a Ticket ↗", external: true },
              ].map(({ href, label, external }) => (
                <li key={href}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Why TicketMint</h4>
            <ul className="space-y-3">
              {[
                "100% Verified tickets",
                "Blockchain-secured",
                "Instant delivery",
                "Money-back guarantee",
                "No hidden fees",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-white/60">
                  <span className="text-[#E8315A] text-xs">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row
                        items-center justify-between gap-3 text-xs text-white/40">
          <p>© {year} TicketMint, Inc. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="/guarantee" className="hover:text-white/70 transition-colors">Privacy</a>
            <a href="/guarantee" className="hover:text-white/70 transition-colors">Terms</a>
            <a href="/guarantee" className="hover:text-white/70 transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
