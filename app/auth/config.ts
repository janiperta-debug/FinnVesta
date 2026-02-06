import { z } from "zod";

const configSchema = z.object({
  projectId: z.string().default(""),
  jwksUrl: z.string().default(""),
  publishableClientKey: z.string().default(""),
  handlerUrl: z.string().default("auth"),
});

export type StackAuthExtensionConfig = z.infer<typeof configSchema>;

// This is set by vite.config.ts
declare const __STACK_AUTH_CONFIG__: string;

function parseStackAuthConfig(): StackAuthExtensionConfig {
  try {
    const raw =
      typeof __STACK_AUTH_CONFIG__ !== "undefined"
        ? __STACK_AUTH_CONFIG__
        : "{}";
    const parsed = JSON.parse(raw);
    if (parsed === undefined || parsed === null) {
      return configSchema.parse({});
    }
    return configSchema.parse(parsed);
  } catch {
    return configSchema.parse({});
  }
}

export const config: StackAuthExtensionConfig = parseStackAuthConfig();
