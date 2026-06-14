/** Production safety checks — no demo fallbacks in live environments */

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function demoUsersAllowed(): boolean {
  return process.env.ALLOW_DEMO_USERS === "true" || !isProductionRuntime();
}

export function requireStrongSecrets(): boolean {
  return isProductionRuntime();
}
