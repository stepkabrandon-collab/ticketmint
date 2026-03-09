"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRTicketProps {
  mintAddress: string;
  size?: number;
}

export function QRTicket({ mintAddress, size = 200 }: QRTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const validateUrl = `${baseUrl}/validate/${mintAddress}`;

    QRCode.toCanvas(canvasRef.current, validateUrl, {
      width: size,
      margin: 2,
      color: {
        dark:  "#0F172A",  // charcoal modules
        light: "#FFFFFF",  // white background
      },
      errorCorrectionLevel: "H",
    }).catch((err) => console.error("[QRTicket]", err));
  }, [mintAddress, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl inline-block"
           style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="block"
          aria-label={`Entry QR code for ticket ${mintAddress}`}
        />
      </div>
      <p className="text-xs text-[#94A3B8] font-mono text-center break-all max-w-[200px]">
        {mintAddress.slice(0, 12)}…{mintAddress.slice(-8)}
      </p>
    </div>
  );
}
