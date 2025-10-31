import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@zeeze/eslint-config/base";

export default defineConfig(
  {
    ignores: ["script/**"],
  },
  baseConfig,
  restrictEnvAccess,
);
