import { defineConfig } from "eslint/config";

import { baseConfig } from "@zeeze/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
);
