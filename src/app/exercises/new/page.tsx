import { AppButton, AppCard, AppInput, AppSelect, AppTextarea, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ImageUpload } from "@/components/image-upload";
import { saveExerciseAction } from "@/lib/exercise-actions";

const muscleGroups = ["Ngực", "Lưng", "Vai", "Tay trước", "Tay sau", "Chân", "Bụng", "Full body"];

export default function NewExercisePage() {
  return (
    <AppShell>
      <PageHeader title="Tạo bài tập" description="Thêm bài mới vào thư viện." />
      <AppCard>
        <form action={saveExerciseAction} className="space-y-4">
          <AppInput name="name" placeholder="Tên bài" required />
          <AppSelect name="muscleGroup" defaultValue="">
            <option value="">Nhóm cơ</option>
            {muscleGroups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </AppSelect>
          <AppInput name="currentWeightKg" type="number" step="0.5" placeholder="Mức tạ hiện tại" />
          <ImageUpload />
          <AppTextarea name="note" rows={4} placeholder="Ghi chú kỹ thuật" />
          <AppButton className="w-full">Lưu bài tập</AppButton>
        </form>
      </AppCard>
    </AppShell>
  );
}
