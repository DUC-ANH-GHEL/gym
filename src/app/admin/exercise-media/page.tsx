import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
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

  return (
    <AppShell>
      <PageHeader
        title="Admin media bài tập"
        description="Xem bài thiếu GIF, nhập folder dataset, kiểm tra ảnh và cập nhật media ngay trên trang admin."
        action={<AdminRouteLinks current="exercise-media" />}
      />

      <AppCard className="space-y-3 border-[#243041] bg-[#121A2B]">
        <div className="space-y-2">
          <h2 className="text-[18px] font-bold text-[#F8FAFC]">Cách làm nhanh</h2>
          <ol className="space-y-1 text-[14px] leading-6 text-[#CBD5E1]">
            <li>1. Chọn bài thiếu GIF.</li>
            <li>2. Tìm folder đúng trong free-exercise-db.</li>
            <li>3. Dán tên folder vào ô Dataset folder name.</li>
            <li>4. Bấm Kiểm tra folder để chắc chắn có đủ 0.jpg và 1.jpg.</li>
            <li>5. Nếu đúng, bấm Cập nhật media để upload Cloudinary và cập nhật DB.</li>
          </ol>
        </div>
        <p className="break-words rounded-[14px] border border-[#243041] bg-[#0F172A] px-3 py-3 text-[13px] text-[#94A3B8]">
          Trang này không chạy Python và không cần sửa file script. Script dự phòng vẫn nằm ở{" "}
          <span className="font-semibold text-[#CBD5E1]">scripts/seed_free_exercise_db_media.py</span>.
        </p>
      </AppCard>

      <AppCard className="space-y-4 border-[#243041] bg-[#121A2B]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-[#F8FAFC]">Lọc bài tập</h2>
            <p className="mt-1 text-[13px] text-[#94A3B8]">
              {formattedItems.length} bài đang hiển thị · {missingCount} bài thiếu GIF trong danh sách hiện tại
            </p>
          </div>
          <Link href="/admin/exercise-media" className="text-[13px] font-semibold text-[#7DD3FC]">
            Xóa lọc
          </Link>
        </div>

        <form method="get" className="flex flex-col gap-3 sm:flex-row">
          <AppInput
            name="search"
            defaultValue={search}
            placeholder="Tìm theo tên hoặc slug"
            className="flex-1 border-[#314155] bg-[#0F172A]"
          />
          <AppSelect
            name="missingAnimation"
            defaultValue={missingAnimation === true ? "true" : missingAnimation === false ? "false" : ""}
            className="border-[#314155] bg-[#0F172A] sm:max-w-[220px]"
          >
            <option value="">Tất cả</option>
            <option value="true">Thiếu animationUrl</option>
            <option value="false">Có animationUrl</option>
          </AppSelect>
          <AppButton className="sm:w-auto">Lọc danh sách</AppButton>
        </form>
      </AppCard>

      {formattedItems.length === 0 ? (
        <EmptyState
          title="Không có bài nào khớp"
          description="Thử đổi từ khóa hoặc đổi filter để xem lại danh sách media bài tập."
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
