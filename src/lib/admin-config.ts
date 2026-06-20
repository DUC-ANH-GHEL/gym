export function getAdminIdentifiers() {
  return (process.env.ADMIN_IDENTIFIERS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminIdentifier(identifier: string) {
  const adminIdentifiers = getAdminIdentifiers();
  return adminIdentifiers.length > 0 && adminIdentifiers.includes(identifier.trim().toLowerCase());
}
