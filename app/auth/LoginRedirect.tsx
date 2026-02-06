import { useStackApp } from "@stackframe/react";
import { Navigate } from "react-router-dom";
import { identify } from "app/analytics";
import { isStackAuthConfigured } from "./stack";

const popFromLocalStorage = (key: string): string | null => {
  if (typeof window !== "undefined" && window.localStorage) {
    const value = localStorage.getItem(key);
    localStorage.removeItem(key);
    return value;
  }

  return null;
};

const LoginRedirectWithStack = () => {
  const app = useStackApp();

  const queryParams = new URLSearchParams(window.location.search);

  const user = app.useUser();
  if (user) {
    identify(user.id, {
      email: user.primaryEmail || undefined,
      name: user.displayName || undefined,
    });
  }

  const next =
    queryParams.get("next") || popFromLocalStorage("dtbn-login-next");

  if (next) {
    return <Navigate to={next} replace={true} />;
  }

  return <Navigate to="/" replace={true} />;
};

export const LoginRedirect = () => {
  if (!isStackAuthConfigured) {
    return <Navigate to="/" replace={true} />;
  }

  return <LoginRedirectWithStack />;
};
