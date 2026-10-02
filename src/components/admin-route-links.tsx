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
                ? "border-[#C8F31D]/50 bg-[#C8F31D]/12 text-[#C8F31D]"
                : "border-[#1F2329] bg-[#14161A] text-[#F4F5F7]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
