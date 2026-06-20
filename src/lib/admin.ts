import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdminIdentifier } from "@/lib/admin-config";

export async function requireAdminUser() {
  const user = await requireUser();

  if (!isAdminIdentifier(user.email)) {
    redirect("/today");
  }

  return user;
}
