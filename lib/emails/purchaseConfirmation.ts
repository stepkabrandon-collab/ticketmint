// ── Purchase Confirmation Email ───────────────────────────────
// Sends a branded HTML email to the buyer after a successful purchase.
// Called from the Stripe webhook after ticket status is updated to "sold".
//
// Gracefully no-ops if RESEND_API_KEY is not set (e.g. in dev without Resend).

import { Resend } from "resend";

export interface PurchaseConfirmationData {
  to:          string;
  eventName:   string;
  venue:       string;
  city:        string;
  eventDate:   string;
  seatSection: string;
  seatRow:     string;
  seatNumber:  string;
  quantity:    number;
  totalUsd:    string;
  orderNumber: string;
  appUrl:      string;
  ticketId?:   string;   // used to build QR + verify URL in email
}

// ── HTML builder ──────────────────────────────────────────────
function buildHtml(d: PurchaseConfirmationData): string {
  const formattedDate = new Date(d.eventDate).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const seatParts = [
    `Sec ${d.seatSection}`,
    d.seatRow    && d.seatRow    !== "GA" ? `Row ${d.seatRow}`    : null,
    d.seatNumber && d.seatNumber !== "GA" ? `Seat #${d.seatNumber}` : null,
  ].filter(Boolean).join(" · ");
  const seatInfo = seatParts || "General Admission";

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed — Ticket Mint</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F9FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:20px;text-align:center;">
              <span style="font-size:24px;font-weight:800;color:#E8315A;letter-spacing:-0.5px;">
                🎟 Ticket Mint
              </span>
            </td>
          </tr>

          <!-- Success banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#E8315A 0%,#7C3AED 100%);border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <span style="display:inline-block;width:56px;height:56px;line-height:56px;background:rgba(255,255,255,0.2);border-radius:50%;font-size:28px;text-align:center;">✓</span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Payment Confirmed!</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">Your ticket is secured on the blockchain.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-radius:0 0 16px 16px;border:1px solid #E2E8F0;border-top:0;">

              <!-- Event block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#F8F9FA;border-radius:12px;border:1px solid #E2E8F0;border-left:4px solid #E8315A;padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;">Event</p>
                    <p style="margin:0 0 10px;font-size:19px;font-weight:800;color:#0F172A;line-height:1.3;">${d.eventName}</p>
                    <p style="margin:0 0 4px;font-size:14px;color:#64748B;">${d.venue}, ${d.city}</p>
                    <p style="margin:0;font-size:14px;color:#64748B;">${formattedDate}</p>
                  </td>
                </tr>
              </table>

              <!-- Order details table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:11px 0;border-bottom:1px solid #F1F5F9;font-size:14px;color:#64748B;">Seat</td>
                  <td align="right" style="padding:11px 0;border-bottom:1px solid #F1F5F9;font-size:14px;font-weight:600;color:#0F172A;">${seatInfo}</td>
                </tr>
                <tr>
                  <td style="padding:11px 0;border-bottom:1px solid #F1F5F9;font-size:14px;color:#64748B;">Quantity</td>
                  <td align="right" style="padding:11px 0;border-bottom:1px solid #F1F5F9;font-size:14px;font-weight:600;color:#0F172A;">${d.quantity} ticket${d.quantity !== 1 ? "s" : ""}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0;font-size:15px;font-weight:700;color:#0F172A;">Total Paid</td>
                  <td align="right" style="padding:14px 0;font-size:20px;font-weight:800;color:#0F172A;">USD $${d.totalUsd}</td>
                </tr>
              </table>

              <!-- Order number -->
              <p style="margin:0 0 28px;text-align:center;font-size:12px;color:#CBD5E1;font-family:'Courier New',monospace;">
                Order #${d.orderNumber}
              </p>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a
                      href="${d.appUrl}/my-tickets"
                      style="display:inline-block;background-color:#E8315A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:10px;letter-spacing:0.1px;"
                    >
                      View My Tickets &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- QR Code -->
              ${d.ticketId ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;">Your Entry QR Code</p>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(JSON.stringify({ ticketId: d.ticketId, orderNumber: d.orderNumber, verifyUrl: d.appUrl + '/validate/' + d.ticketId }))}&bgcolor=ffffff&color=0f172a&format=png&ecc=H"
                         width="160" height="160" alt="Ticket QR Code"
                         style="border:1px solid #E2E8F0;border-radius:12px;padding:8px;background:#fff;" />
                    <p style="margin:8px 0 0;font-size:12px;color:#94A3B8;">Show at venue entrance</p>
                  </td>
                </tr>
              </table>` : ""}

              <!-- Note -->
              <p style="margin:0;font-size:13px;color:#94A3B8;text-align:center;line-height:1.6;">
                Your ticket NFT will appear in your wallet once the blockchain transaction confirms.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 8px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#94A3B8;">
                Questions? &nbsp;<a href="mailto:support@ticketmint.io" style="color:#E8315A;text-decoration:none;font-weight:600;">support@ticketmint.io</a>
              </p>
              <p style="margin:0;font-size:12px;color:#CBD5E1;">
                &copy; ${year} Ticket Mint. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Send function ──────────────────────────────────────────────
export async function sendPurchaseConfirmation(
  data: PurchaseConfirmationData
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_placeholder") {
    console.warn(
      "[Email] RESEND_API_KEY not configured — skipping confirmation email to",
      data.to
    );
    return;
  }

  const resend = new Resend(apiKey);

  console.log("[Email] Attempting to send confirmation to:", data.to);

  const result = await resend.emails.send({
    from:    "Ticket Mint <onboarding@resend.dev>",
    to:      [data.to],
    subject: `Order Confirmed: ${data.eventName}`,
    html:    buildHtml(data),
  });

  console.log("[Email] Resend response:", JSON.stringify(result));

  if (result.error) {
    throw new Error(`Resend API error: ${result.error.message}`);
  }

  console.log(`[Email] Confirmation sent to ${data.to} for order #${data.orderNumber}`);
}
