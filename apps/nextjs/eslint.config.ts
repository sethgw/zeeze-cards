import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@zeeze/eslint-config/base";
import { nextjsConfig } from "@zeeze/eslint-config/nextjs";
import { reactConfig } from "@zeeze/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
