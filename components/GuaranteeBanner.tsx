import Link from "next/link";

export function GuaranteeBanner() {
  return (
    <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-[#059669] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#065F46] text-sm">100% Buyer Guarantee</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
          {["Verified tickets", "Secure checkout", "Full refund if event is cancelled"].map((s) => (
            <span key={s} className="text-xs text-[#047857] flex items-center gap-1">
              <span className="font-bold">✓</span> {s}
            </span>
          ))}
        </div>
      </div>
      <Link
        href="/guarantee"
        className="text-xs text-[#059669] hover:text-[#047857] underline flex-shrink-0 font-medium transition-colors"
      >
        Learn more →
      </Link>
    </div>
  );
}
