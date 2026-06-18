"use server";

import { redirect } from "next/navigation";
import { registerUser } from "@/lib/auth";

export async function registerAction(formData: FormData): Promise<void> {
  const result = await registerUser(formData);
  if ("error" in result) {
    redirect("/register?error=invalid");
  }

  redirect("/today");
}
