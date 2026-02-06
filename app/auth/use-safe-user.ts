import { useUser as useStackUser } from "@stackframe/react";
import { isStackAuthConfigured } from "./stack";

/**
 * A safe wrapper around useUser that returns null when Stack Auth is not configured.
 * This prevents crashes when StackProvider is not in the component tree.
 */
export function useSafeUser() {
  // When auth is not configured, always return null.
  // This is safe because isStackAuthConfigured is a module-level constant
  // that never changes at runtime, so the hook call order is stable.
  if (!isStackAuthConfigured) {
    return null;
  }
  return useStackUser();
}
