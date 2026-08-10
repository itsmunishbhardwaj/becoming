import { defineWorkspace } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineWorkspace([
  {
    test: {
      name: "node",
      environment: "node",
      include: ["src/**/*.test.js"],
    },
  },
  {
    plugins: [react()],
    test: {
      name: "jsdom",
      environment: "jsdom",
      include: ["src/**/*.test.jsx"],
      globals: true,
      setupFiles: ["src/test-setup.js"],
    },
  },
]);
