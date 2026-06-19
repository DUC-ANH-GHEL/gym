export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  const adminEmails = getAdminEmails();
  return adminEmails.length > 0 && adminEmails.includes(email.trim().toLowerCase());
}
