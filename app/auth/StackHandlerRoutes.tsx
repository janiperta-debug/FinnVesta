import { APP_BASE_PATH } from "@/constants";
import { StackHandler, StackTheme } from "@stackframe/react";
import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { stackClientApp, isStackAuthConfigured } from "./stack";
import { joinPaths } from "./utils";

export const StackHandlerRoutes = () => {
  const location = useLocation();

  if (!isStackAuthConfigured || !stackClientApp) {
    return <Navigate to="/" replace />;
  }

  return (
    <StackTheme>
      <StackHandler
        app={stackClientApp}
        location={joinPaths(APP_BASE_PATH, location.pathname)}
        fullPage={true}
      />
    </StackTheme>
  );
};
