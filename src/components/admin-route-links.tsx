import Link from "next/link";

const adminLinks = [
  { href: "/admin/templates", label: "Template lịch", key: "templates" },
  { href: "/admin/exercises", label: "Metadata bài tập", key: "exercises" },
  { href: "/admin/exercise-media", label: "Media bài tập", key: "exercise-media" },
] as const;

export function AdminRouteLinks({ current }: { current: (typeof adminLinks)[number]["key"] }) {
  return (
    <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
      {adminLinks.map((item) => {
        const isCurrent = item.key === current;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isCurrent ? "page" : undefined}
            className={`min-h-[44px] rounded-[14px] border px-4 py-3 text-[14px] font-semibold transition ${
              isCurrent
                ? "border-[#22C55E]/50 bg-[#22C55E]/12 text-[#86EFAC]"
                : "border-[#243041] bg-[#121A2B] text-[#F8FAFC]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
