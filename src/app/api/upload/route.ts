import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { cloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { normalizeUploadKind, validateUploadFile } from "@/lib/media-upload-policy";

function isSameOriginPost(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return false;
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
    return NextResponse.json({ error: "Vui l\u00f2ng \u0111\u0103ng nh\u1eadp \u0111\u1ec3 t\u1ea3i file." }, { status: 401 });
  }

  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "Ngu\u1ed3n y\u00eau c\u1ea7u kh\u00f4ng h\u1ee3p l\u1ec7." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = normalizeUploadKind(formData.get("kind"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ch\u01b0a ch\u1ecdn file." }, { status: 400 });
  }

  const validation = validateUploadFile(file, kind);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Ch\u01b0a c\u1ea5u h\u00ecnh Cloudinary." }, { status: 503 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: kind === "animation" ? "gym-planner/gifs" : "gym-planner/images",
    resource_type: "image",
    overwrite: false,
  });

  return NextResponse.json(
    { secure_url: result.secure_url, kind },
    { headers: { "Cache-Control": "no-store" } },
  );
}
