import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  buildExerciseMediaFilterHref,
  hasAnimationUrl,
  normalizeExerciseMediaSearch,
  parseMissingAnimationFilter,
} from "@/lib/exercise-media-admin";
import { AdminExerciseMediaCard } from "@/components/admin-exercise-media-card";
import { AdminRouteLinks } from "@/components/admin-route-links";
import { AppButton, AppCard, AppInput, AppSelect, EmptyState, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";

type SearchParams = {
  search?: string;
  missingAnimation?: string;
};

const updatedAtFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export default async function AdminExerciseMediaPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  await requireAdminUser();

  const search = normalizeExerciseMediaSearch(params?.search);
  const missingAnimation = parseMissingAnimationFilter(params?.missingAnimation);
  const filters: Prisma.ExerciseCatalogItemWhereInput[] = [];

  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (missingAnimation === true) {
    filters.push({
      OR: [{ animationUrl: null }, { animationUrl: "" }],
    });
  }

  if (missingAnimation === false) {
    filters.push({
      NOT: {
        OR: [{ animationUrl: null }, { animationUrl: "" }],
      },
    });
  }

  const items = await prisma.exerciseCatalogItem.findMany({
    where: filters.length > 0 ? { AND: filters } : undefined,
    select: {
      id: true,
      slug: true,
      name: true,
      muscleGroup: true,
      imageUrl: true,
      animationUrl: true,
      updatedAt: true,
    },
    orderBy: [{ name: "asc" }],
  });

  const formattedItems = items.map((item) => ({
    ...item,
    updatedAtLabel: updatedAtFormatter.format(item.updatedAt),
  }));
  const missingCount = formattedItems.filter((item) => !hasAnimationUrl(item.animationUrl)).length;
  const hasFilter = Boolean(search || typeof missingAnimation === "boolean");

  return (
    <AppShell>
      <PageHeader
        title="Admin media bài tập"
        description="Tìm bài thật nhanh rồi upload GIF hoặc cập nhật media ngay trên trang này."
        action={<AdminRouteLinks current="exercise-media" />}
      />

      <AppCard className="sticky top-2 z-20 space-y-3 border-[#38BDF8]/35 bg-[#0F172A]/95 shadow-xl backdrop-blur">
        <form method="get" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <AppInput
              name="search"
              defaultValue={search}
              placeholder="Gõ tên bài, ví dụ: squat, bench, lateral..."
              className="flex-1 border-[#38BDF8]/45 bg-[#111827] text-[17px]"
              autoComplete="off"
            />
            <AppSelect
              name="missingAnimation"
              defaultValue={missingAnimation === true ? "true" : missingAnimation === false ? "false" : ""}
              className="border-[#38BDF8]/45 bg-[#111827] text-[17px] sm:max-w-[220px]"
            >
              <option value="">Tất cả bài</option>
              <option value="true">Chỉ bài thiếu GIF</option>
              <option value="false">Chỉ bài đã có GIF</option>
            </AppSelect>
            <AppButton className="sm:w-auto">Tìm</AppButton>
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href={buildExerciseMediaFilterHref({ search, missingAnimation: true })}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#F59E0B]/45 bg-[#2A1F08] px-4 text-[13px] font-black text-[#FCD34D]"
          >
            Thiếu GIF
          </Link>
          <Link
            href={buildExerciseMediaFilterHref({ search, missingAnimation: false })}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#22C55E]/45 bg-[#12301F] px-4 text-[13px] font-black text-[#86EFAC]"
          >
            Có GIF
          </Link>
          {hasFilter ? (
            <Link
              href="/admin/exercise-media"
              className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#374151] bg-[#111827] px-4 text-[13px] font-black text-[#F9FAFB]"
            >
              Xóa lọc
            </Link>
          ) : null}
        </div>

        <p className="text-[13px] font-semibold text-[#CBD5E1]">
          Đang thấy {formattedItems.length} bài · {missingCount} bài thiếu GIF trong kết quả này
        </p>
      </AppCard>

      <AppCard className="space-y-3 border-[#243041] bg-[#121A2B]">
        <div className="space-y-2">
          <h2 className="text-[18px] font-bold text-[#F8FAFC]">Cách làm nhanh</h2>
          <ol className="space-y-1 text-[14px] leading-6 text-[#CBD5E1]">
            <li>1. Gõ tên bài vào ô tìm kiếm ở trên.</li>
            <li>2. Nếu bài chưa có GIF, bấm Upload GIF ngay trong thẻ bài đó.</li>
            <li>3. Nếu bài có trong free-exercise-db, vẫn có thể nhập folder và bấm Cập nhật media.</li>
          </ol>
        </div>
      </AppCard>

      {formattedItems.length === 0 ? (
        <EmptyState
          title="Không có bài nào khớp"
          description="Thử gõ ngắn hơn, ví dụ squat, press, curl, row hoặc xóa lọc để xem lại toàn bộ."
          actionHref="/admin/exercise-media"
          actionLabel="Xem lại toàn bộ"
        />
      ) : (
        <section className="space-y-4">
          {formattedItems.map((item) => (
            <AdminExerciseMediaCard key={item.id} item={item} />
          ))}
        </section>
      )}
    </AppShell>
  );
}
