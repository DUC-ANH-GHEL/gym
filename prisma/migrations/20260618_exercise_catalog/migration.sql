-- CreateTable
CREATE TABLE "ExerciseCatalogItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" TEXT,
    "imageUrl" TEXT,
    "defaultWeightKg" DOUBLE PRECISION,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseCatalogItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "catalogItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseCatalogItem_slug_key" ON "ExerciseCatalogItem"("slug");
CREATE INDEX "ExerciseCatalogItem_isActive_sortOrder_idx" ON "ExerciseCatalogItem"("isActive", "sortOrder");
CREATE INDEX "ExerciseCatalogItem_muscleGroup_sortOrder_idx" ON "ExerciseCatalogItem"("muscleGroup", "sortOrder");
CREATE INDEX "Exercise_catalogItemId_idx" ON "Exercise"("catalogItemId");
CREATE UNIQUE INDEX "Exercise_userId_catalogItemId_key" ON "Exercise"("userId", "catalogItemId");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ExerciseCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed catalog metadata
INSERT INTO "ExerciseCatalogItem" ("id", "slug", "name", "muscleGroup", "imageUrl", "defaultWeightKg", "note", "sortOrder", "isActive", "updatedAt") VALUES
('catalog_bench_press', 'bench-press', 'Bench Press', 'Ngực', '/exercise-placeholder.png', 40, 'Ép ngực với thanh đòn. Giữ vai ổn định, hạ tạ có kiểm soát.', 10, true, CURRENT_TIMESTAMP),
('catalog_incline_dumbbell_press', 'incline-dumbbell-press', 'Incline Dumbbell Press', 'Ngực', '/exercise-placeholder.png', 16, 'Đẩy ngực trên với tạ đơn. Không khóa khuỷu quá gắt ở đỉnh.', 20, true, CURRENT_TIMESTAMP),
('catalog_cable_fly', 'cable-fly', 'Cable Fly', 'Ngực', '/exercise-placeholder.png', 10, 'Ép ngực bằng cáp. Tập trung cảm giác co cơ, không vung người.', 30, true, CURRENT_TIMESTAMP),
('catalog_lat_pulldown', 'lat-pulldown', 'Lat Pulldown', 'Lưng', '/exercise-placeholder.png', 35, 'Kéo xô xuống trước ngực. Kéo bằng khuỷu, hạn chế ngả lưng quá nhiều.', 40, true, CURRENT_TIMESTAMP),
('catalog_seated_cable_row', 'seated-cable-row', 'Seated Cable Row', 'Lưng', '/exercise-placeholder.png', 35, 'Kéo cáp ngồi. Giữ lưng trung lập và siết bả vai ở cuối nhịp.', 50, true, CURRENT_TIMESTAMP),
('catalog_deadlift', 'deadlift', 'Deadlift', 'Lưng', '/exercise-placeholder.png', 60, 'Kéo tạ từ sàn. Ưu tiên kỹ thuật và lưng trung lập trước khi tăng tạ.', 60, true, CURRENT_TIMESTAMP),
('catalog_shoulder_press', 'shoulder-press', 'Shoulder Press', 'Vai', '/exercise-placeholder.png', 20, 'Đẩy vai. Siết core, tránh ưỡn lưng quá mức.', 70, true, CURRENT_TIMESTAMP),
('catalog_lateral_raise', 'lateral-raise', 'Lateral Raise', 'Vai', '/exercise-placeholder.png', 6, 'Nâng vai ngang. Dùng tạ vừa đủ, nâng có kiểm soát.', 80, true, CURRENT_TIMESTAMP),
('catalog_face_pull', 'face-pull', 'Face Pull', 'Vai', '/exercise-placeholder.png', 15, 'Kéo cáp về mặt. Tốt cho vai sau và ổn định bả vai.', 90, true, CURRENT_TIMESTAMP),
('catalog_barbell_curl', 'barbell-curl', 'Barbell Curl', 'Tay trước', '/exercise-placeholder.png', 15, 'Cuốn tay trước với thanh đòn. Giữ khuỷu ổn định.', 100, true, CURRENT_TIMESTAMP),
('catalog_hammer_curl', 'hammer-curl', 'Hammer Curl', 'Tay trước', '/exercise-placeholder.png', 10, 'Cuốn búa với tạ đơn. Giữ cổ tay trung lập.', 110, true, CURRENT_TIMESTAMP),
('catalog_triceps_pushdown', 'triceps-pushdown', 'Triceps Pushdown', 'Tay sau', '/exercise-placeholder.png', 20, 'Đẩy cáp tay sau. Khóa khuỷu sát thân, kiểm soát nhịp.', 120, true, CURRENT_TIMESTAMP),
('catalog_overhead_triceps_extension', 'overhead-triceps-extension', 'Overhead Triceps Extension', 'Tay sau', '/exercise-placeholder.png', 12, 'Duỗi tay sau qua đầu. Cảm nhận phần tay sau dài.', 130, true, CURRENT_TIMESTAMP),
('catalog_squat', 'squat', 'Squat', 'Chân', '/exercise-placeholder.png', 50, 'Gánh tạ squat. Giữ core chắc và kiểm soát độ sâu phù hợp.', 140, true, CURRENT_TIMESTAMP),
('catalog_leg_press', 'leg-press', 'Leg Press', 'Chân', '/exercise-placeholder.png', 80, 'Đạp chân máy. Không khóa gối mạnh ở đỉnh.', 150, true, CURRENT_TIMESTAMP),
('catalog_romanian_deadlift', 'romanian-deadlift', 'Romanian Deadlift', 'Chân', '/exercise-placeholder.png', 40, 'Hip hinge cho đùi sau/mông. Giữ lưng trung lập.', 160, true, CURRENT_TIMESTAMP),
('catalog_plank', 'plank', 'Plank', 'Bụng', '/exercise-placeholder.png', NULL, 'Giữ thân người thẳng. Siết bụng và mông, không võng lưng.', 170, true, CURRENT_TIMESTAMP),
('catalog_cable_crunch', 'cable-crunch', 'Cable Crunch', 'Bụng', '/exercise-placeholder.png', 20, 'Gập bụng với cáp. Cuộn cột sống có kiểm soát.', 180, true, CURRENT_TIMESTAMP),
('catalog_burpee', 'burpee', 'Burpee', 'Full body', '/exercise-placeholder.png', NULL, 'Bài toàn thân cường độ cao. Giữ nhịp ổn định.', 190, true, CURRENT_TIMESTAMP),
('catalog_kettlebell_swing', 'kettlebell-swing', 'Kettlebell Swing', 'Full body', '/exercise-placeholder.png', 16, 'Swing bằng hông, không kéo bằng tay. Siết core ở đỉnh.', 200, true, CURRENT_TIMESTAMP);
