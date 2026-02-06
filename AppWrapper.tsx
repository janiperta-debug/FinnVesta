import type { ReactNode } from "react";
import { RouterProvider } from "react-router-dom";
import { Head } from "./internal-components/Head";
import { OuterErrorBoundary } from "./prod-components/OuterErrorBoundary";
import { router } from "./router";
import { ThemeProvider } from "./internal-components/ThemeProvider";
import { DEFAULT_THEME } from "./constants/default-theme";
import { StackProvider } from "@stackframe/react";
import { stackClientApp, isStackAuthConfigured } from "app/auth";

const AuthWrapper = ({ children }: { children: ReactNode }) => {
  if (isStackAuthConfigured && stackClientApp) {
    return <StackProvider app={stackClientApp}>{children}</StackProvider>;
  }
  return <>{children}</>;
};

export const AppWrapper = () => {
  return (
    <OuterErrorBoundary>
      <AuthWrapper>
        <ThemeProvider defaultTheme={DEFAULT_THEME}>
          <RouterProvider router={router} />
          <Head />
        </ThemeProvider>
      </AuthWrapper>
    </OuterErrorBoundary>
  );
};
