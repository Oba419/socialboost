import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

// Live tests call real external APIs using .env.local. Run explicitly: `npm run test:live`.
// (@next/env intentionally skips .env.local when NODE_ENV=test, so parse it here.)
function readEnvLocal(): Record<string, string> {
  const file = new URL("./.env.local", import.meta.url);
  if (!existsSync(file)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || !m[2]) continue;
    env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return env;
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/live/**/*.live.test.ts"],
    env: readEnvLocal(),
    testTimeout: 300_000,
    fileParallelism: false,
  },
});
