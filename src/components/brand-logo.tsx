export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-[16px] border border-[#2A2F36] bg-[#14161A] shadow-lg shadow-[#C8F31D]/10">
        <svg viewBox="0 0 64 64" aria-hidden="true" className="h-9 w-9">
          <defs>
            <linearGradient id="brandMark" x1="8" y1="10" x2="56" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F4F5F7" />
              <stop offset="0.48" stopColor="#C8F31D" />
              <stop offset="1" stopColor="#C8F31D" />
            </linearGradient>
          </defs>
          <path d="M37.8 25.4c-2.3-2.9-5.9-4.8-10.1-4.8-7.4 0-13 5.3-13 11.8 0 6.6 5.6 11.8 13 11.8 6.1 0 10.7-3.3 12.2-8.2H27.4v-7.1h21.4c.3 1.3.4 2.6.4 4 0 11-8.5 19-21.2 19-12.8 0-23-8.5-23-19.5S15.2 12.9 28 12.9c6.6 0 12.2 2.4 16.2 6.2l-6.4 6.3Z" fill="url(#brandMark)" />
          <rect x="3" y="28" width="13" height="8" rx="3" fill="#C8F31D" />
          <rect x="48" y="28" width="13" height="8" rx="3" fill="#C8F31D" />
        </svg>
      </div>
      {!compact ? (
        <div>
          <p className="text-[18px] font-black leading-none text-[#F4F5F7]">Gym Planner</p>
          <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C8F31D]">Train. Track. Repeat.</p>
        </div>
      ) : null}
    </div>
  );
}
