"use server";

import { redirect } from "next/navigation";
import { loginUser } from "@/lib/auth";

export async function loginAction(formData: FormData): Promise<void> {
  const result = await loginUser(formData);
  if ("error" in result) {
    redirect("/login?error=invalid");
  }

  redirect("/today");
}
