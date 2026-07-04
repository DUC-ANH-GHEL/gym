export function buildExerciseGuideItems(note: string | null | undefined) {
  return (note ?? "")
    .split(/[.;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .map((item) => (/[.!?]$/.test(item) ? item : `${item}.`));
}

export function getExerciseGuideFallback(exerciseName: string) {
  return `Bài ${exerciseName} chưa có hướng dẫn chi tiết. Tập chậm, giữ lưng chắc và dừng lại nếu thấy đau bất thường.`;
}
