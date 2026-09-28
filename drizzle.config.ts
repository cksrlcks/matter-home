import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// CLI(drizzle-kit)에서 .env.local의 DATABASE_URL을 읽도록 로드한다.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
