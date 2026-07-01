# Guide quản lý media bài tập

## 1. Media bài tập là gì

- `imageUrl` là ảnh thumbnail của bài tập.
- `animationUrl` là GIF động, được ưu tiên hiển thị khi app có cả ảnh và GIF.
- Dataset gốc đang lấy từ repo local `tools/exercisedb/free-exercise-db-main`.

Script hiện tại:

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

## 5. Thêm mapping thủ công

Khi auto match chưa đúng, mở file:

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
- dán tên đó vào `MANUAL_MATCH_MAP`

Tên folder phải khớp 100%, kể cả dấu gạch dưới và chữ hoa chữ thường nếu bạn muốn tránh nhầm khi rà soát tay.

## 7. Ý nghĩa các trạng thái trong log

- `safe`: match đủ chắc, có thể update
- `needs_review`: đang nghi ngờ, chưa update
- `not_found`: chưa tìm được folder phù hợp
- `updated`: đã upload media và đã update DB

Gợi ý đọc log:

- `safe` là nhóm ưu tiên xử lý
- `needs_review` phải xem lại trước khi chạy thật
- `not_found` thường cần thêm mapping tay

## 8. Cách xử lý bài đang bị thiếu media

Khi một bài chưa có GIF hoặc chưa có ảnh đúng:

1. Tìm slug của bài trong app, admin hoặc DB.
2. Tìm folder đúng trong dataset local.
3. Thêm mapping vào `MANUAL_MATCH_MAP` trong `scripts/seed_free_exercise_db_media.py`.
4. Chạy dry-run theo đúng slug.
5. Nếu log đúng thì chạy thật theo slug đó.

Ví dụ quy trình ngắn:

```bash
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing --dry-run
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing
```

## 9. Cách xử lý bài bị match sai

Nếu script đang match nhầm folder:

- thêm cặp sai vào `BLOCK_MATCH_MAP` để chặn
- hoặc thêm mapping đúng vào `MANUAL_MATCH_MAP`

Sau đó chạy lại với `--include-existing`:

```bash
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing --dry-run
python scripts/seed_free_exercise_db_media.py --slug romanian-deadlift --include-existing
```

## 10. Cảnh báo khi chạy script

- Không chạy `--apply-review` nếu chưa kiểm tra kỹ log.
- Không chạy full dataset nếu dry-run chưa ổn.
- Luôn test trước 20 đến 50 bài.

Thứ tự an toàn nên là:

1. dry-run batch nhỏ
2. dry-run theo slug nghi ngờ
3. chạy thật theo slug
4. chạy thật batch nhỏ
5. chỉ chạy rộng hơn khi log đã ổn định
