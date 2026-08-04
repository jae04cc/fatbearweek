import { defineConfig } from "vitest/config";
import path from "path";

// Mirrors the `@/*` -> `src/*` path alias from tsconfig.json so tests can
// import app modules the same way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
