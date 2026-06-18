import { NextResponse } from "next/server";
import { cloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { getSessionUserId } from "@/lib/auth";

function isSameOriginPost(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để tải ảnh." }, { status: 401 });
  }

  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chưa chọn ảnh." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Chỉ hỗ trợ file ảnh." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Ảnh tối đa 5MB." }, { status: 400 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Chưa cấu hình Cloudinary." }, { status: 503 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "gym-planner",
    resource_type: "image",
  });

  return NextResponse.json(
    { secure_url: result.secure_url },
    { headers: { "Cache-Control": "no-store" } },
  );
}
