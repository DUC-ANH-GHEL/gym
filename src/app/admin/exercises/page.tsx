import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";
import {
  buildAdminExercisesFilterHref,
  getAdminExerciseMediaStatus,
  normalizeAdminExerciseSearch,
  parseAdminExerciseStatusFilter,
} from "@/lib/admin-exercises";
import { saveCatalogItemAction, toggleCatalogItemActiveAction, updateCatalogItemAction } from "@/lib/catalog-admin-actions";
import { EXERCISE_PLACEHOLDER_SRC, type ExerciseMedia } from "@/lib/exercise-media";
import { prisma } from "@/lib/prisma";
import { AdminRouteLinks } from "@/components/admin-route-links";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { ImageUpload } from "@/components/image-upload";
import { AppButton, AppCard, AppInput, AppSelect, AppTextarea, EmptyState, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";

type SearchParams = {
  error?: string;
  created?: string;
  updated?: string;
  search?: string;
  status?: string;
};

const muscleGroups = ["Ngực", "Lưng", "Vai", "Tay trước", "Tay sau", "Chân", "Mông", "Bắp chân", "Bụng", "Cẳng tay", "Cardio", "Full body"];

function getFilterLabel(status: string | undefined) {
  switch (status) {
    case "missing-image":
      return "Thiếu ảnh";
    case "missing-gif":
      return "Thiếu GIF";
    case "hidden":
      return "Đang ẩn";
    case "active":
      return "Đang hiện";
    default:
      return "Tất cả";
  }
}

function getMediaForPreview(item: { name: string; imageUrl: string | null; animationUrl: string | null }): ExerciseMedia {
  const status = getAdminExerciseMediaStatus(item);

  if (status.hasGif && item.animationUrl) {
    return { src: item.animationUrl, kind: "animation", isPlaceholder: false };
  }

  if (status.hasImage && item.imageUrl) {
    return { src: item.imageUrl, kind: "image", isPlaceholder: false };
  }

  return { src: EXERCISE_PLACEHOLDER_SRC, kind: "placeholder", isPlaceholder: true };
}

function StatusPill({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`inline-flex min-h-[30px] items-center rounded-full px-3 text-[12px] font-black ${className}`}>{label}</span>;
}

export default async function AdminExercisesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  await requireAdminUser();

  const search = normalizeAdminExerciseSearch(params?.search);
  const status = parseAdminExerciseStatusFilter(params?.status);
  const filters: Prisma.ExerciseCatalogItemWhereInput[] = [];

  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { muscleGroup: { contains: search, mode: "insensitive" } },
        { note: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (status === "missing-image") {
    filters.push({ OR: [{ imageUrl: null }, { imageUrl: "" }, { imageUrl: EXERCISE_PLACEHOLDER_SRC }] });
  }

  if (status === "missing-gif") {
    filters.push({ OR: [{ animationUrl: null }, { animationUrl: "" }] });
  }

  if (status === "hidden") {
    filters.push({ isActive: false });
  }

  if (status === "active") {
    filters.push({ isActive: true });
  }

  const where = filters.length > 0 ? { AND: filters } : undefined;
  const missingImageWhere = { OR: [{ imageUrl: null }, { imageUrl: "" }, { imageUrl: EXERCISE_PLACEHOLDER_SRC }] };
  const missingGifWhere = { OR: [{ animationUrl: null }, { animationUrl: "" }] };

  const [catalogItems, totalCount, missingImageCount, missingGifCount, hiddenCount] = await Promise.all([
    prisma.exerciseCatalogItem.findMany({
      where,
      orderBy: [{ name: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.exerciseCatalogItem.count(),
    prisma.exerciseCatalogItem.count({ where: missingImageWhere }),
    prisma.exerciseCatalogItem.count({ where: missingGifWhere }),
    prisma.exerciseCatalogItem.count({ where: { isActive: false } }),
  ]);

  const hasFilter = Boolean(search || status);

  return (
    <AppShell>
      <PageHeader title="Admin bài tập" description="Quản lý metadata dùng cho lịch và template." />
      <AdminRouteLinks current="exercises" />

      {params?.error ? (
        <p className="rounded-[14px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
          {params.error === "animation"
            ? "GIF chỉ nhận đường dẫn nội bộ bắt đầu bằng / hoặc link Cloudinary https://res.cloudinary.com/..."
            : params.error === "image"
              ? "Ảnh chỉ nhận đường dẫn nội bộ bắt đầu bằng / hoặc link Cloudinary https://res.cloudinary.com/..."
              : "Metadata chưa hợp lệ. Kiểm tra tên, ảnh URL, GIF URL, mức tạ và thứ tự."}
        </p>
      ) : null}

      {params?.created || params?.updated ? (
        <p className="rounded-[14px] border border-[#22C55E]/50 bg-[#22C55E]/10 px-3 py-2 text-[13px] font-semibold text-[#86EFAC]">
          {params.created ? "Đã thêm bài mới vào kho." : "Đã lưu metadata bài tập."}
        </p>
      ) : null}

      <AppCard className="sticky top-2 z-20 space-y-3 border-[#38BDF8]/35 bg-[#0F172A]/95 shadow-xl backdrop-blur">
        <form method="get" className="space-y-3">
          <AppInput
            name="search"
            defaultValue={search}
            placeholder="Tìm tên bài, nhóm cơ, slug"
            className="border-[#38BDF8]/45 bg-[#111827] text-[17px]"
            autoComplete="off"
          />
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]">Tìm metadata</AppButton>
        </form>

        <div className="flex max-w-full flex-wrap gap-2">
          {[
            { label: "Tất cả", value: undefined },
            { label: "Thiếu ảnh", value: "missing-image" as const },
            { label: "Thiếu GIF", value: "missing-gif" as const },
            { label: "Đang ẩn", value: "hidden" as const },
          ].map((item) => {
            const isCurrent = item.value === status || (!item.value && !status);

            return (
              <Link
                key={item.label}
                href={buildAdminExercisesFilterHref({ search, status: item.value })}
                className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-black ${
                  isCurrent ? "border-[#0EA5E9] bg-[#0EA5E9] text-[#082F49]" : "border-[#334155] bg-[#111827] text-[#CBD5E1]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {hasFilter ? (
            <Link href="/admin/exercises" className="shrink-0 rounded-full border border-[#374151] bg-[#111827] px-4 py-2 text-[13px] font-black text-[#F8FAFC]">
              Xóa lọc
            </Link>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[14px] bg-[#0B1220] px-3 py-2">
            <p className="text-[18px] font-black text-[#F8FAFC]">{totalCount}</p>
            <p className="text-[11px] font-bold text-[#94A3B8]">bài</p>
          </div>
          <div className="rounded-[14px] bg-[#2A1F08] px-3 py-2">
            <p className="text-[18px] font-black text-[#FCD34D]">{missingImageCount}</p>
            <p className="text-[11px] font-bold text-[#FDE68A]">thiếu ảnh</p>
          </div>
          <div className="rounded-[14px] bg-[#2A1F08] px-3 py-2">
            <p className="text-[18px] font-black text-[#FCD34D]">{missingGifCount}</p>
            <p className="text-[11px] font-bold text-[#FDE68A]">thiếu GIF</p>
          </div>
        </div>

        <p className="text-[13px] font-semibold text-[#CBD5E1]">
          Đang xem {catalogItems.length} bài · Bộ lọc: {getFilterLabel(status)}{hiddenCount > 0 ? ` · ${hiddenCount} bài đang ẩn` : ""}
        </p>
      </AppCard>

      <details className="rounded-[20px] border border-[#243041] bg-[#111827] p-4">
        <summary className="cursor-pointer list-none text-[17px] font-black text-[#F8FAFC] [&::-webkit-details-marker]:hidden">
          Thêm metadata mới
          <span className="mt-1 block text-[13px] font-semibold leading-5 text-[#94A3B8]">
            Mở khi cần thêm bài, không chiếm hết màn hình.
          </span>
        </summary>

        <form action={saveCatalogItemAction} className="mt-4 space-y-4">
          <AppInput name="name" placeholder="Tên bài" required />
          <AppSelect name="muscleGroup" defaultValue="">
            <option value="">Nhóm cơ</option>
            {muscleGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </AppSelect>
          <div className="grid grid-cols-2 gap-2">
            <AppInput name="defaultWeightKg" type="number" step="0.5" placeholder="Tạ gợi ý" inputMode="decimal" />
            <AppInput name="sortOrder" type="number" placeholder="Thứ tự" inputMode="numeric" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ImageUpload name="imageUrl" kind="image" label="Upload ảnh" />
            <ImageUpload name="animationUrl" kind="animation" label="Upload GIF" />
          </div>
          <AppTextarea name="note" rows={4} placeholder="Ghi chú kỹ thuật" />
          <label className="flex min-h-[48px] items-center gap-3 rounded-[14px] bg-[#1F2937] px-3 text-[14px] font-bold text-[#F9FAFB]">
            <input type="checkbox" name="isActive" defaultChecked className="h-6 w-6 accent-[#22C55E]" />
            Hiện trong kho bài tập
          </label>
          <AppButton className="w-full">Lưu metadata</AppButton>
        </form>
      </details>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[18px] font-black text-[#F9FAFB]">Kho bài tập</h2>
            <p className="mt-1 text-[13px] text-[#9CA3AF]">{catalogItems.length} kết quả</p>
          </div>
        </div>

        {catalogItems.length === 0 ? (
          <EmptyState
            title="Không có bài nào khớp"
            description="Thử gõ ngắn hơn, ví dụ squat, press, curl, row hoặc xóa lọc để xem lại toàn bộ."
            actionHref="/admin/exercises"
            actionLabel="Xem toàn bộ"
          />
        ) : (
          <div className="space-y-3">
            {catalogItems.map((item) => {
              const mediaStatus = getAdminExerciseMediaStatus(item);
              const media = getMediaForPreview(item);
              const statusClassName =
                mediaStatus.tone === "ready"
                  ? "border-[#22C55E]/35 bg-[#12301F] text-[#86EFAC]"
                  : mediaStatus.tone === "danger"
                    ? "border-[#EF4444]/35 bg-[#3B0C0C] text-[#FCA5A5]"
                    : "border-[#F59E0B]/35 bg-[#2A1F08] text-[#FCD34D]";

              return (
                <AppCard key={item.id} className={item.isActive ? "space-y-3 border-[#263244] bg-[#101827]" : "space-y-3 border-[#263244] bg-[#101827] opacity-70"}>
                  <ExerciseMediaPreview
                    media={media}
                    alt={item.name}
                    width={640}
                    height={360}
                    imageClassName="aspect-[16/9] w-full rounded-[16px] object-cover"
                    placeholderClassName="flex aspect-[16/9] w-full items-center justify-center rounded-[16px] border border-dashed border-[#334155] bg-[#0B1220] px-3 text-center text-[14px] font-black text-[#94A3B8]"
                    placeholderLabel="Chưa có ảnh"
                    buttonClassName="block w-full rounded-[16px]"
                    sizes="(max-width: 480px) calc(100vw - 56px), 424px"
                  />

                  <div className="min-w-0 space-y-2">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-[19px] font-black leading-6 text-[#F9FAFB]">{item.name}</h3>
                        <p className="mt-1 break-all text-[12px] font-semibold text-[#94A3B8]">{item.slug}</p>
                      </div>
                      <StatusPill label={item.isActive ? "Đang hiện" : "Đã ẩn"} className={item.isActive ? "bg-[#22C55E]/15 text-[#86EFAC]" : "bg-[#EF4444]/15 text-[#FCA5A5]"} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StatusPill label={item.muscleGroup || "Chưa nhóm cơ"} className="bg-[#0EA5E9]/12 text-[#7DD3FC]" />
                      <StatusPill label={`${item.defaultWeightKg ?? 0} kg`} className="bg-[#1F2937] text-[#CBD5E1]" />
                      <StatusPill label={mediaStatus.label} className={`border ${statusClassName}`} />
                    </div>

                    {item.note ? <p className="line-clamp-3 text-[14px] leading-6 text-[#CBD5E1]">{item.note}</p> : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <details className="min-w-0 rounded-[14px] border border-[#334155] bg-[#172234]">
                      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-center px-3 text-[14px] font-black text-[#F8FAFC] [&::-webkit-details-marker]:hidden">
                        Sửa
                      </summary>
                      <form action={updateCatalogItemAction} className="space-y-3 border-t border-[#334155] p-3">
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="imageUrl" value={item.imageUrl || ""} />
                        <input type="hidden" name="animationUrl" value={item.animationUrl || ""} />
                        <AppInput name="name" defaultValue={item.name} placeholder="Tên bài" required className="text-[15px]" />
                        <AppSelect name="muscleGroup" defaultValue={item.muscleGroup || ""} className="text-[15px]">
                          <option value="">Nhóm cơ</option>
                          {muscleGroups.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </AppSelect>
                        <div className="grid grid-cols-2 gap-2">
                          <AppInput name="defaultWeightKg" type="number" step="0.5" defaultValue={item.defaultWeightKg ?? ""} placeholder="Tạ" inputMode="decimal" className="text-[15px]" />
                          <AppInput name="sortOrder" type="number" defaultValue={item.sortOrder} placeholder="Thứ tự" inputMode="numeric" className="text-[15px]" />
                        </div>
                        <AppTextarea name="note" rows={3} defaultValue={item.note || ""} placeholder="Ghi chú kỹ thuật" className="text-[15px]" />
                        <label className="flex min-h-[44px] items-center gap-3 rounded-[12px] bg-[#0B1220] px-3 text-[13px] font-bold text-[#F9FAFB]">
                          <input type="checkbox" name="isActive" defaultChecked={item.isActive} className="h-5 w-5 accent-[#22C55E]" />
                          Hiện trong kho
                        </label>
                        <AppButton className="w-full min-h-[44px] text-[14px]">Lưu sửa</AppButton>
                      </form>
                    </details>

                    <form action={toggleCatalogItemActiveAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="isActive" value={item.isActive ? "" : "on"} />
                      <button className="min-h-[44px] w-full rounded-[14px] border border-[#334155] bg-[#172234] px-3 text-[14px] font-black text-[#F8FAFC]">
                        {item.isActive ? "Ẩn" : "Hiện lại"}
                      </button>
                    </form>
                  </div>
                </AppCard>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
