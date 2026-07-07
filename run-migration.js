const { execSync } = require("child_process");

// Read the migration SQL
const fs = require("fs");
const sql = fs.readFileSync(
  "prisma/migrations/20260707_add_duplicata_parcelas/migration.sql",
  "utf8"
);

// Execute the SQL against the Railway database
try {
  execSync(`psql "${process.env.DATABASE_URL}" -c "${sql.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
    stdio: "inherit",
    timeout: 30000,
  });
  console.log("Migration applied successfully!");
} catch (e) {
  console.log("Migration execution attempted:", e.message);
}
