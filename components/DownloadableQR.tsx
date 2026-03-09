"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface DownloadableQRProps {
  /** The raw string to encode into the QR (JSON payload or URL) */
  data:     string;
  /** Filename prefix for the downloaded PNG */
  label?:   string;
  size?:    number;
}

export function DownloadableQR({ data, label = "ticket", size = 200 }: DownloadableQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    }).catch((err) => console.error("[DownloadableQR]", err));
  }, [data, size]);

  function download() {
    if (!canvasRef.current) return;
    const link      = document.createElement("a");
    link.download   = `ticketmint-${label}.png`;
    link.href       = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl inline-block"
           style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
        <canvas ref={canvasRef} width={size} height={size} className="block"
                aria-label="Ticket QR code for venue entry" />
      </div>
      <button
        onClick={download}
        className="btn-secondary px-5 py-2.5 text-sm font-semibold rounded-xl min-h-[44px]
                   flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Ticket PNG
      </button>
    </div>
  );
}
