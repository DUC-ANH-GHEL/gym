import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AppButton, AppCard, AppInput, AppSelect, AppTextarea, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ImageUpload } from "@/components/image-upload";
import { deleteExerciseAction, saveExerciseAction } from "@/lib/exercise-actions";

const muscleGroups = ["Ngực", "Lưng", "Vai", "Tay trước", "Tay sau", "Chân", "Bụng", "Full body"];

export default async function EditExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const exercise = await prisma.exercise.findFirst({ where: { id, userId: user.id } });

  if (!exercise) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader title="Sửa bài tập" description="Cập nhật thông tin và ảnh." />
      <AppCard>
        <form action={saveExerciseAction} className="space-y-4">
          <input type="hidden" name="id" value={exercise.id} />
          <AppInput name="name" defaultValue={exercise.name} placeholder="Tên bài" required />
          <AppSelect name="muscleGroup" defaultValue={exercise.muscleGroup || ""}>
            <option value="">Nhóm cơ</option>
            {muscleGroups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </AppSelect>
          <AppInput name="currentWeightKg" type="number" step="0.5" defaultValue={exercise.currentWeightKg ?? ""} placeholder="Mức tạ hiện tại" />
          <ImageUpload defaultValue={exercise.imageUrl} />
          <AppTextarea name="note" rows={4} defaultValue={exercise.note ?? ""} placeholder="Ghi chú kỹ thuật" />
          <AppButton className="w-full">Lưu thay đổi</AppButton>
        </form>
        <form action={deleteExerciseAction} className="mt-4">
          <input type="hidden" name="exerciseId" value={exercise.id} />
          <button className="min-h-[44px] w-full rounded-[14px] bg-[#EF4444] px-4 py-3 text-[15px] font-bold text-white">Xóa bài tập</button>
        </form>
      </AppCard>
    </AppShell>
  );
}
