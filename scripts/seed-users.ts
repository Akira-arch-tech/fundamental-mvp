/**
 * 在启用 DATABASE_URL 时，写入验收用后台账号（与 verify-clickflow / verify-mvp 的 DB 模式对齐）。
 * 密码：`VERIFY_SEED_PASSWORD` 环境变量，默认 `FundamentalVerify#2026`（仅本地/CI，勿用于生产）。
 *
 *   DATABASE_URL=... npx tsx scripts/seed-users.ts
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/db/auth-repository";
import { users } from "@/lib/db/schema";

const DEFAULT_PASSWORD = "FundamentalVerify#2026";

const SEEDS = [
  {
    id: "usr_seed_admin",
    email: "verify-admin@fundamental.local",
    displayName: "Verify Admin",
    role: "admin" as const,
  },
  {
    id: "usr_seed_ops",
    email: "verify-ops@fundamental.local",
    displayName: "Verify Ops",
    role: "ops" as const,
  },
  {
    id: "usr_seed_cs",
    email: "verify-cs@fundamental.local",
    displayName: "Verify CS",
    role: "customer_service" as const,
  },
];

async function main() {
  const db = getDb();
  if (!db) {
    console.error("DATABASE_URL is not set; cannot seed users.");
    process.exit(1);
  }
  const plain = process.env.VERIFY_SEED_PASSWORD?.trim() || DEFAULT_PASSWORD;
  const passwordHash = await hashPassword(plain);

  for (const u of SEEDS) {
    await db
      .insert(users)
      .values({
        id: u.id,
        email: u.email,
        passwordHash,
        displayName: u.displayName,
        role: u.role,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          passwordHash,
          displayName: u.displayName,
          role: u.role,
          email: u.email,
        },
      });
  }

  const check = await db.select().from(users).where(eq(users.email, SEEDS[0].email)).limit(1);
  if (check.length === 0) {
    console.error("Seed verification failed: admin user not readable.");
    process.exit(1);
  }
  console.log(
    `Seeded ${SEEDS.length} users (${SEEDS.map((s) => s.email).join(", ")}). Password from VERIFY_SEED_PASSWORD or default.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
