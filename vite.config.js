import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createVaultMiddleware } from "./src/dev/vaultMiddleware.js";
import { createLlmMiddleware } from "./src/dev/llmMiddleware.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: "becoming-vault-api",
      configureServer(server) {
        server.middlewares.use(
          createVaultMiddleware({ vaultRoot: path.join(here, "vault") })
        );
        server.middlewares.use(createLlmMiddleware({ env: process.env }));
      },
    },
  ],
});
