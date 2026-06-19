import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";

export async function requireAdminUser() {
  const user = await requireUser();

  if (!isAdminEmail(user.email)) {
    redirect("/today");
  }

  return user;
}
