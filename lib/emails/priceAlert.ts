// ── Price Alert Email ─────────────────────────────────────────
import { Resend } from "resend";

export interface PriceAlertData {
  to:           string;
  eventName:    string;
  venue:        string;
  city:         string;
  eventDate:    string;
  currentPrice: number;    // USD
  targetPrice:  number;    // USD
  appUrl:       string;
  searchQuery:  string;    // for the buy link
}

function buildHtml(d: PriceAlertData): string {
  const formattedDate = new Date(d.eventDate).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const year = new Date().getFullYear();
  const buyUrl = `${d.appUrl}/?q=${encodeURIComponent(d.searchQuery)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Price Alert — Ticket Mint</title></head>
<body style="margin:0;padding:0;background:#F8F9FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;padding:32px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <!-- Logo -->
    <tr><td style="padding-bottom:20px;text-align:center;">
      <span style="font-size:22px;font-weight:800;color:#E8315A;">🎟 Ticket Mint</span>
    </td></tr>
    <!-- Alert banner -->
    <tr><td style="background:linear-gradient(135deg,#7C3AED,#E8315A);border-radius:16px 16px 0 0;padding:36px;text-align:center;">
      <p style="margin:0 0 8px;font-size:36px;">🎯</p>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">Price Alert!</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">
        Tickets for <strong>${d.eventName}</strong> are now within your target price.
      </p>
    </td></tr>
    <!-- Body -->
    <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px;border:1px solid #E2E8F0;border-top:0;">
      <!-- Event -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;border-radius:12px;border-left:4px solid #7C3AED;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;">Event</p>
          <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0F172A;">${d.eventName}</p>
          <p style="margin:0 0 4px;font-size:14px;color:#64748B;">${d.venue}, ${d.city}</p>
          <p style="margin:0;font-size:14px;color:#64748B;">${formattedDate}</p>
        </td></tr>
      </table>
      <!-- Price comparison -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #F1F5F9;font-size:14px;color:#64748B;">Current lowest price</td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #F1F5F9;font-size:18px;font-weight:800;color:#059669;">$${d.currentPrice}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;font-size:14px;color:#64748B;">Your target price</td>
          <td align="right" style="padding:12px 0;font-size:14px;font-weight:600;color:#64748B;">$${d.targetPrice}</td>
        </tr>
      </table>
      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr><td align="center">
          <a href="${buyUrl}" style="display:inline-block;background:#E8315A;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:10px;">
            Buy Tickets Now →
          </a>
        </td></tr>
      </table>
      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;">
        Prices may change. This alert was sent because the price dropped to or below your target.
      </p>
    </td></tr>
    <!-- Footer -->
    <tr><td style="padding:24px 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#94A3B8;">
        Questions? <a href="mailto:support@ticketmint.io" style="color:#E8315A;text-decoration:none;">support@ticketmint.io</a>
      </p>
      <p style="margin:0;font-size:12px;color:#CBD5E1;">© ${year} Ticket Mint.</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function sendPriceAlert(data: PriceAlertData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_placeholder") {
    console.warn("[PriceAlert] RESEND_API_KEY not set — skipping email to", data.to);
    return;
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from:    "Ticket Mint <onboarding@resend.dev>",
    to:      [data.to],
    subject: `🎯 Price Alert: ${data.eventName} tickets from $${data.currentPrice}!`,
    html:    buildHtml(data),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  console.log(`[PriceAlert] Sent to ${data.to} for "${data.eventName}"`);
}
