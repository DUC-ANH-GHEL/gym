import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin";

export default async function AdminPage() {
  await requireAdminUser();
  redirect("/admin/templates");
}
