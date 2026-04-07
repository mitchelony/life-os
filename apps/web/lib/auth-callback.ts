export type AuthCallbackRecoveryAction = {
  href: string;
  label: string;
};

export function getAuthCallbackRecoveryAction(hasSession: boolean): AuthCallbackRecoveryAction {
  if (hasSession) {
    return {
      href: "/",
      label: "Back to app",
    };
  }

  return {
    href: "/login",
    label: "Back to login",
  };
}
