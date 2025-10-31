import { defineConfig } from "eslint/config";

import { baseConfig } from "@zeeze/eslint-config/base";
import { reactConfig } from "@zeeze/eslint-config/react";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
);
