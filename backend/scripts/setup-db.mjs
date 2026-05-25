/**
 * Applies missing Supabase tables. Requires DATABASE_URL in backend/.env:
 * Supabase Dashboard → Project Settings → Database → Connection string (URI)
 * Example: postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env");

function loadEnv() {
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

const env = loadEnv();
const databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL in backend/.env\n\n" +
      "1. Open https://supabase.com/dashboard/project/ozaqavrhznfcmeqtujlj/settings/database\n" +
      "2. Copy the Connection string (URI) under Session pooler\n" +
      "3. Add to backend/.env: DATABASE_URL=postgresql://...\n" +
      "4. Run: npm run db:setup\n\n" +
      "Or run supabase/migrations/003_ensure_summaries.sql in the SQL Editor."
  );
  process.exit(1);
}

const migrationsDir = join(root, "..", "supabase", "migrations");
const migrationFiles = [
  "003_ensure_summaries.sql",
  "004_fix_quizzes_columns.sql",
  "005_verified_roadmap.sql",
  "006_university_intelligence.sql",
];

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of migrationFiles) {
    const migrationPath = join(migrationsDir, file);
    const sql = readFileSync(migrationPath, "utf8");
    await client.query(sql);
    console.log(`Applied: ${file}`);
  }
  console.log("Database setup complete.");
} catch (err) {
  console.error("Setup failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
