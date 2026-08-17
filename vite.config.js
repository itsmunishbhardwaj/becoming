import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createVaultMiddleware } from "./src/dev/vaultMiddleware.js";
import { createLlmMiddleware } from "./src/dev/llmMiddleware.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, here, ["LLM_", "VAULT_"]) };
  const vaultRoot = env.VAULT_ROOT || path.join(here, "vault");
  // eslint-disable-next-line no-console
  console.log(`[becoming] vault: ${vaultRoot}${env.VAULT_ROOT ? "" : " (in-repo fallback — set VAULT_ROOT in .env)"}`);
  return {
    plugins: [
      react(),
      {
        name: "becoming-vault-api",
        configureServer(server) {
          server.middlewares.use(createVaultMiddleware({ vaultRoot }));
          server.middlewares.use(createLlmMiddleware({ env }));
        },
      },
    ],
  };
});
