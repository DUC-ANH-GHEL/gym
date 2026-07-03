import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { saveCatalogItemAction, toggleCatalogItemActiveAction } from "@/lib/catalog-admin-actions";
import { AdminRouteLinks } from "@/components/admin-route-links";
import { AppButton, AppCard, AppInput, AppSelect, AppTextarea, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { ImageUpload } from "@/components/image-upload";

const muscleGroups = ["Ngực", "Lưng", "Vai", "Tay trước", "Tay sau", "Chân", "Bụng", "Full body"];

export default async function AdminExercisesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; created?: string }>;
}) {
  const params = await searchParams;
  await requireAdminUser();

  const catalogItems = await prisma.exerciseCatalogItem.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <AppShell>
      <PageHeader
        title="Admin bài tập"
        description="Quản lý metadata bài tập chung dùng cho lịch và template."
        action={
          <Link href="/admin/templates" className="shrink-0 rounded-[14px] bg-[#1F2937] px-4 py-3 text-[15px] font-bold text-[#F9FAFB]">
            Template lịch
          </Link>
        }
      />
      <AdminRouteLinks current="exercises" />

      {params?.error ? (
        <p className="rounded-[12px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
          {params.error === "animation"
            ? "GIF chỉ nhận đường dẫn nội bộ bắt đầu bằng / hoặc link Cloudinary https://res.cloudinary.com/..."
            : params.error === "image"
              ? "Ảnh chỉ nhận đường dẫn nội bộ bắt đầu bằng / hoặc link Cloudinary https://res.cloudinary.com/..."
              : "Metadata chưa hợp lệ. Kiểm tra tên, ảnh URL, GIF URL, mức tạ và thứ tự."}
        </p>
      ) : null}

      {params?.created ? (
        <p className="rounded-[12px] border border-[#22C55E]/50 bg-[#22C55E]/10 px-3 py-2 text-[13px] font-semibold text-[#86EFAC]">
          Đã thêm bài mới vào kho.
        </p>
      ) : null}

      <AppCard>
        <form action={saveCatalogItemAction} className="space-y-4">
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
            <ImageUpload name="imageUrl" kind="image" label="Upload ảnh thumbnail" />
            <ImageUpload name="animationUrl" kind="animation" label="Upload GIF động" />
          </div>
          <AppTextarea name="note" rows={4} placeholder="Ghi chú kỹ thuật" />
          <label className="flex min-h-[48px] items-center gap-3 rounded-[12px] bg-[#1F2937] px-3 text-[14px] font-bold text-[#F9FAFB]">
            <input type="checkbox" name="isActive" defaultChecked className="h-6 w-6 accent-[#22C55E]" />
            Hiện trong kho bài tập
          </label>
          <AppButton className="w-full">Thêm metadata</AppButton>
        </form>
      </AppCard>

      <section className="space-y-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#F9FAFB]">Kho hiện tại</h2>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">{catalogItems.length} bài metadata</p>
        </div>

        <div className="space-y-3">
          {catalogItems.map((item) => (
            <AppCard key={item.id} className={item.isActive ? "space-y-3" : "space-y-3 opacity-60"}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-[17px] font-bold text-[#F9FAFB]">{item.name}</h3>
                  <p className="text-[13px] text-[#9CA3AF]">
                    {item.muscleGroup || "Chưa có nhóm cơ"} · {item.defaultWeightKg ?? 0}kg · #{item.sortOrder}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold ${item.isActive ? "bg-[#22C55E]/15 text-[#86EFAC]" : "bg-[#EF4444]/15 text-[#FCA5A5]"}`}>
                  {item.isActive ? "Đang hiện" : "Đã ẩn"}
                </span>
              </div>
              {item.imageUrl || item.animationUrl ? (
                <div className="grid grid-cols-2 gap-2">
                  {item.imageUrl ? (
                    <div className="min-w-0">
                      <p className="mb-1 text-[12px] font-bold text-[#9CA3AF]">Ảnh</p>
                      <ExerciseMediaPreview
                        media={{ src: item.imageUrl, kind: "image", isPlaceholder: false }}
                        alt={item.name}
                        width={320}
                        height={180}
                        imageClassName="h-24 w-full rounded-[12px] object-cover"
                        placeholderClassName="hidden"
                        buttonClassName="block w-full rounded-[12px]"
                        sizes="320px"
                      />
                    </div>
                  ) : null}
                  {item.animationUrl ? (
                    <div className="min-w-0">
                      <p className="mb-1 text-[12px] font-bold text-[#9CA3AF]">GIF</p>
                      <ExerciseMediaPreview
                        media={{ src: item.animationUrl, kind: "animation", isPlaceholder: false }}
                        alt={`${item.name} GIF`}
                        width={320}
                        height={180}
                        imageClassName="h-24 w-full rounded-[12px] object-cover"
                        placeholderClassName="hidden"
                        buttonClassName="block w-full rounded-[12px]"
                        sizes="320px"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {item.note ? <p className="text-[14px] leading-5 text-[#D1D5DB]">{item.note}</p> : null}
              <form action={toggleCatalogItemActiveAction} className="flex gap-2">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="isActive" value={item.isActive ? "" : "on"} />
                <button className="min-h-[44px] w-full rounded-[12px] bg-[#1F2937] px-3 py-2 text-[14px] font-bold text-[#F9FAFB]">
                  {item.isActive ? "Ẩn khỏi kho" : "Hiện lại"}
                </button>
              </form>
            </AppCard>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
