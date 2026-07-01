# Guide quản lý media bài tập

## Cách chính: dùng UI admin

Vào trang admin:

`/admin/exercise-media`

Quy trình trên UI:

1. Chọn bài đang thiếu GIF hoặc bài nghi bị sai media.
2. Tìm folder đúng trong free-exercise-db.
3. Dán tên folder vào ô `Dataset folder name`.
4. Bấm `Kiểm tra folder` để chắc chắn folder có đủ `0.jpg` và `1.jpg`.
5. Nếu đúng, bấm `Cập nhật media`.

Trang admin sẽ upload media lên Cloudinary và cập nhật `ExerciseCatalogItem` trong DB. Không cần sửa file script cho từng bài khi dùng cách này.

Script dự phòng vẫn là:

`scripts/seed_free_exercise_db_media.py`

## 1. Media bài tập là gì

- `imageUrl` là ảnh thumbnail của bài tập.
- `animationUrl` là GIF động, được ưu tiên hiển thị khi app có cả ảnh và GIF.
- Dataset gốc lấy từ free-exercise-db local ở `tools/exercisedb/free-exercise-db-main`.

Script `scripts/seed_free_exercise_db_media.py` dùng để chạy batch hoặc xử lý nâng cao:

- lấy ảnh đầu để tạo thumbnail WebP
- lấy 2 ảnh đầu để tạo GIF động
- upload media lên Cloudinary
- cập nhật lại `ExerciseCatalogItem` trong DB Neon

## 2. Chạy dry-run trước

Luôn chạy thử trước với batch nhỏ:

```bash
python scripts/seed_free_exercise_db_media.py --limit 50 --dry-run
```

## 3. Chạy thật theo batch nhỏ

Sau khi dry-run ổn, chạy thật với batch nhỏ:

```bash
python scripts/seed_free_exercise_db_media.py --limit 50
```

## 4. Chạy một bài cụ thể

Dry-run cho một slug:

```bash
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing --dry-run
```

Chạy thật cho một slug:

```bash
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing
```

`--include-existing` hữu ích khi bài đó đã có media cũ nhưng cần kiểm tra hoặc sửa lại mapping.

## 5. Thêm mapping thủ công khi chạy script

Với flow thường ngày, hãy dùng UI admin trước để không phải sửa code.

Chỉ sửa mapping thủ công khi cần chạy script batch hoặc cần chặn auto-match sai. Mở file:

`scripts/seed_free_exercise_db_media.py`

Thêm mapping vào `MANUAL_MATCH_MAP`:

```python
"romanian-deadlift": "Romanian_Deadlift"
```

Quy ước:

- bên trái là slug trong DB
- bên phải là tên folder trong `tools/exercisedb/free-exercise-db-main/exercises`

## 6. Cách biết folder đúng

Mở thư mục:

`tools/exercisedb/free-exercise-db-main/exercises`

Sau đó:

- tìm đúng bài tập cần dùng
- copy chính xác tên folder
- dán tên đó vào ô `Dataset folder name` trên `/admin/exercise-media`

Nếu dùng script dự phòng, dán tên folder đó vào `MANUAL_MATCH_MAP` trong `scripts/seed_free_exercise_db_media.py`.

Tên folder phải khớp 100%, kể cả dấu gạch dưới và chữ hoa chữ thường nếu bạn muốn tránh nhầm khi rà soát tay.

## 7. Ý nghĩa các trạng thái trong log script

- `safe`: match đủ chắc, có thể update
- `needs_review`: đang nghi ngờ, chưa update
- `not_found`: chưa tìm được folder phù hợp
- `updated`: đã upload media và đã update DB

Gợi ý đọc log:

- `safe` là nhóm ưu tiên xử lý
- `needs_review` phải xem lại trước khi chạy thật
- `not_found` thường cần thêm mapping tay hoặc xử lý trực tiếp bằng UI admin

## 8. Cách xử lý bài đang thiếu media

Cách nên dùng:

1. Vào `/admin/exercise-media`.
2. Lọc `Thiếu animationUrl`.
3. Copy slug nếu cần đối chiếu.
4. Tìm folder đúng trong dataset.
5. Dán folder vào `Dataset folder name`.
6. Bấm `Kiểm tra folder`.
7. Nếu đúng, bấm `Cập nhật media`.

Cách dự phòng bằng script:

```bash
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing --dry-run
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing
```

## 9. Cách xử lý bài bị match sai

Cách nên dùng:

1. Vào `/admin/exercise-media`.
2. Tìm bài theo tên hoặc slug.
3. Nhập folder đúng.
4. Bấm `Kiểm tra folder`.
5. Bấm `Cập nhật media` để ghi đè `imageUrl` và `animationUrl`.

Nếu dùng script và script đang match nhầm folder:

- thêm cặp sai vào `BLOCK_MATCH_MAP` trong `scripts/seed_free_exercise_db_media.py` để chặn
- hoặc thêm mapping đúng vào `MANUAL_MATCH_MAP` trong `scripts/seed_free_exercise_db_media.py`

Sau đó chạy lại với `--include-existing`:

```bash
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing --dry-run
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing
```

## 10. Cảnh báo khi chạy script

- Không chạy `--apply-review` nếu chưa kiểm tra kỹ log.
- Không chạy full dataset nếu dry-run chưa ổn.
- Luôn test trước 20 đến 50 bài.
- Với từng bài lẻ, ưu tiên dùng `/admin/exercise-media` để không phải sửa code.

Thứ tự an toàn nếu bắt buộc dùng script:

1. dry-run batch nhỏ
2. dry-run theo slug nghi ngờ
3. chạy thật theo slug
4. chạy thật batch nhỏ
5. chỉ chạy rộng hơn khi log đã ổn định
