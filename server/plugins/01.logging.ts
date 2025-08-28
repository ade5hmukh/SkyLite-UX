import type { LogLevel } from "consola";

// @ts-expect-error - useRuntimeConfig is a valid import
import { useRuntimeConfig } from "#imports";
import { consola } from "consola";
import { defineNitroPlugin } from "nitropack/runtime/plugin";

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  const logLevel = config.public?.logLevel;

  consola.level = logLevel as unknown as LogLevel;

  consola.start(`Server log level configured to: ${logLevel}`);
});
