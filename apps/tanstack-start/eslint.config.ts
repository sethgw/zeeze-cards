import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@zeeze/eslint-config/base";
import { reactConfig } from "@zeeze/eslint-config/react";

export default defineConfig(
  {
    ignores: [".nitro/**", ".output/**", ".tanstack/**"],
  },
  baseConfig,
  reactConfig,
  restrictEnvAccess,
);
