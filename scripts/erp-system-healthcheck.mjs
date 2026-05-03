import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { Client } from "pg";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Load environment variables from .env file
config({ path: path.join(projectRoot, ".env") });


const STATUS = {
  PASS: "PASS",
  FAIL: "FAIL",
  WARN: "WARN",
  SKIP: "SKIP",
};

const requiredEnv = ["DATABASE_URL"];

const env = {
  databaseUrl: process.env.DATABASE_URL || "",
  supabaseUrl: normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  sqlPath:
    process.env.ERP_HEALTHCHECK_SQL_PATH ||
    path.join(projectRoot, "SQL_database.sql"),
  rlsExemptTables: new Set(
    (process.env.ERP_HEALTHCHECK_RLS_EXEMPT_TABLES || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  ),
  strictRls: parseBool(process.env.ERP_HEALTHCHECK_STRICT_RLS, true),
  alertWebhookUrl: process.env.ERP_HEALTHCHECK_ALERT_WEBHOOK_URL || "",
};

const checks = [];
const startedAt = new Date();

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return fallback;
}

function normalizeSupabaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function toMs(start) {
  return Math.round(performance.now() - start);
}

function pushCheck({ section, name, status, detail, meta = {}, durationMs = 0 }) {
  const entry = { section, name, status, detail, durationMs, meta };
  checks.push(entry);
  printCheck(entry);
}

function printCheck(entry) {
  const icon =
    entry.status === STATUS.PASS
      ? "[PASS]"
      : entry.status === STATUS.FAIL
      ? "[FAIL]"
      : entry.status === STATUS.WARN
      ? "[WARN]"
      : "[SKIP]";
  console.log(
    `${icon} ${entry.section} :: ${entry.name} (${entry.durationMs} ms) - ${entry.detail}`
  );
}

async function runCheck(section, name, fn) {
  const checkStart = performance.now();
  try {
    const result = await fn();
    pushCheck({
      section,
      name,
      status: result.status,
      detail: result.detail,
      meta: result.meta || {},
      durationMs: toMs(checkStart),
    });
    return result;
  } catch (error) {
    pushCheck({
      section,
      name,
      status: STATUS.FAIL,
      detail: error instanceof Error ? error.message : String(error),
      meta: { error: String(error) },
      durationMs: toMs(checkStart),
    });
    return { status: STATUS.FAIL, detail: String(error) };
  }
}

function getExpectedSchema(sqlContent) {
  const tableRegex = /CREATE TABLE public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/g;
  const schema = new Map();
  let match;

  while ((match = tableRegex.exec(sqlContent)) !== null) {
    const [, tableName, body] = match;
    const lines = body
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("CONSTRAINT"));

    const columns = [];
    for (const rawLine of lines) {
      const line = rawLine.replace(/,$/, "");
      const colMatch = line.match(/^"?([a-zA-Z0-9_]+)"?\s+/);
      if (colMatch) {
        const colName = colMatch[1].toUpperCase();
        if (!["CONSTRAINT", "WHEN", "THEN", "ELSE", "END", "CASE"].includes(colName)) {
          columns.push(colMatch[1]);
        }
      }
    }

    schema.set(tableName, columns);
  }

  return schema;
}

function markdownEscape(value) {
  return String(value).replace(/\|/g, "\\|");
}

async function writeReports(summary, allChecks) {
  const logsDir = path.join(projectRoot, "logs");
  await fs.mkdir(logsDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(logsDir, `erp-healthcheck-${stamp}.json`);
  const mdPath = path.join(logsDir, `erp-healthcheck-${stamp}.md`);
  const alertPath = path.join(logsDir, `erp-healthcheck-alert-${stamp}.txt`);

  const reportPayload = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    environment: {
      sqlPath: env.sqlPath,
      strictRls: env.strictRls,
      rlsExemptTables: Array.from(env.rlsExemptTables),
    },
    summary,
    checks: allChecks,
  };

  await fs.writeFile(jsonPath, JSON.stringify(reportPayload, null, 2), "utf8");

  const lines = [];
  lines.push("# ERP System Healthcheck");
  lines.push("");
  lines.push(`- Started: ${startedAt.toISOString()}`);
  lines.push(`- Finished: ${new Date().toISOString()}`);
  lines.push(`- Total: ${summary.total}`);
  lines.push(`- PASS: ${summary.pass}`);
  lines.push(`- FAIL: ${summary.fail}`);
  lines.push(`- WARN: ${summary.warn}`);
  lines.push(`- SKIP: ${summary.skip}`);
  lines.push("");
  lines.push("| Section | Check | Status | Duration(ms) | Detail |");
  lines.push("|---|---|---:|---:|---|");

  for (const check of allChecks) {
    lines.push(
      `| ${markdownEscape(check.section)} | ${markdownEscape(
        check.name
      )} | ${check.status} | ${check.durationMs} | ${markdownEscape(
        check.detail
      )} |`
    );
  }

  await fs.writeFile(mdPath, lines.join("\n"), "utf8");

  const failChecks = allChecks.filter((c) => c.status === STATUS.FAIL);
  if (failChecks.length > 0) {
    const alertLines = [];
    alertLines.push("ERP HEALTHCHECK ALERT");
    alertLines.push(`Timestamp: ${new Date().toISOString()}`);
    alertLines.push(`Fail count: ${failChecks.length}`);
    alertLines.push("");
    for (const fail of failChecks) {
      alertLines.push(`- [${fail.section}] ${fail.name}: ${fail.detail}`);
    }
    await fs.writeFile(alertPath, alertLines.join("\n"), "utf8");
  }

  return { jsonPath, mdPath, alertPath, hasAlert: failChecks.length > 0 };
}

async function postAlertWebhook(summary, allChecks, alertFilePath) {
  if (!env.alertWebhookUrl) {
    return { status: STATUS.SKIP, detail: "Webhook URL not configured." };
  }

  const failChecks = allChecks
    .filter((c) => c.status === STATUS.FAIL)
    .map((c) => `[${c.section}] ${c.name}: ${c.detail}`);

  if (failChecks.length === 0) {
    return { status: STATUS.SKIP, detail: "No failures, webhook skipped." };
  }

  const payload = {
    type: "erp_healthcheck_alert",
    summary,
    failures: failChecks,
    alert_file: alertFilePath,
    created_at: new Date().toISOString(),
  };

  const res = await fetch(env.alertWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return {
      status: STATUS.FAIL,
      detail: `Webhook request failed: HTTP ${res.status}`,
    };
  }

  return { status: STATUS.PASS, detail: "Webhook alert sent successfully." };
}

async function main() {
  console.log("=== ERP System Healthcheck ===");
  console.log(`Started at: ${startedAt.toISOString()}`);
  console.log(`SQL file: ${env.sqlPath}`);
  console.log("");

  for (const key of requiredEnv) {
    await runCheck("Config", `Env ${key}`, async () => {
      const val = process.env[key];
      if (!val) {
        return { status: STATUS.FAIL, detail: `${key} is missing.` };
      }
      return { status: STATUS.PASS, detail: `${key} is set.` };
    });
  }

  if (!env.databaseUrl || !env.supabaseUrl || !env.supabaseAnonKey) {
    console.error(
      "\nAborting: Missing required environment variables. Please set DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY."
    );
    process.exitCode = 2;
    return;
  }

  let sqlContent = "";
  const schemaStart = performance.now();
  try {
    sqlContent = await fs.readFile(env.sqlPath, "utf8");
    pushCheck({
      section: "Schema",
      name: "Load SQL schema file",
      status: STATUS.PASS,
      detail: "Loaded SQL schema successfully.",
      durationMs: toMs(schemaStart),
      meta: { sqlPath: env.sqlPath },
    });
  } catch (error) {
    pushCheck({
      section: "Schema",
      name: "Load SQL schema file",
      status: STATUS.FAIL,
      detail: `Cannot read SQL file: ${error}`,
      durationMs: toMs(schemaStart),
    });
    process.exitCode = 2;
    return;
  }

  const expectedSchema = getExpectedSchema(sqlContent);
  await runCheck("Schema", "Parse SQL expected tables", async () => {
    if (expectedSchema.size === 0) {
      return {
        status: STATUS.FAIL,
        detail: "No CREATE TABLE entries found in SQL file.",
      };
    }
    return {
      status: STATUS.PASS,
      detail: `Parsed ${expectedSchema.size} expected tables from SQL file.`,
    };
  });

  const client = new Client({
    connectionString: env.databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
  } catch (error) {
    pushCheck({
      section: "Database",
      name: "Connect PostgreSQL",
      status: STATUS.FAIL,
      detail: `Connection failed: ${error}`,
      durationMs: 0,
    });
    process.exitCode = 2;
    return;
  }

  await runCheck("Database", "Connectivity", async () => {
    const result = await client.query(
      "select current_database() as db, current_user as usr, now() as ts"
    );
    return {
      status: STATUS.PASS,
      detail: `Connected to ${result.rows[0].db} as ${result.rows[0].usr}.`,
      meta: result.rows[0],
    };
  });

  const tableResult = await runCheck("Schema", "Public tables discovery", async () => {
    const res = await client.query(
      "select tablename from pg_catalog.pg_tables where schemaname = 'public' order by tablename"
    );
    return {
      status: STATUS.PASS,
      detail: `Discovered ${res.rows.length} public tables.`,
      meta: { tableNames: res.rows.map((r) => r.tablename) },
    };
  });

  const actualTables = new Set(tableResult.meta?.tableNames || []);
  await runCheck("Schema", "Expected tables exist", async () => {
    const missing = Array.from(expectedSchema.keys()).filter(
      (name) => !actualTables.has(name)
    );
    if (missing.length > 0) {
      return {
        status: STATUS.FAIL,
        detail: `Missing ${missing.length} tables: ${missing.join(", ")}`,
        meta: { missing },
      };
    }
    return {
      status: STATUS.PASS,
      detail: "All expected tables from SQL file are present.",
    };
  });

  const columnMismatches = [];
  for (const [tableName, expectedColumns] of expectedSchema.entries()) {
    const query = await client.query(
      `select column_name
       from information_schema.columns
       where table_schema = 'public' and table_name = $1
       order by ordinal_position`,
      [tableName]
    );
    const actualCols = new Set(query.rows.map((r) => r.column_name));
    const missingCols = expectedColumns.filter((col) => !actualCols.has(col));
    if (missingCols.length > 0) {
      columnMismatches.push({ tableName, missingCols });
    }
  }

  await runCheck("Schema", "Critical column coverage", async () => {
    if (columnMismatches.length > 0) {
      const compact = columnMismatches
        .slice(0, 5)
        .map((x) => `${x.tableName}: ${x.missingCols.join(", ")}`)
        .join(" | ");
      return {
        status: STATUS.FAIL,
        detail: `Column mismatches in ${columnMismatches.length} table(s). ${compact}`,
        meta: { columnMismatches },
      };
    }
    return { status: STATUS.PASS, detail: "All expected columns are present." };
  });

  await runCheck("Schema", "shop_holidays.holiday_date constraint guard", async () => {
    const result = await client.query(
      `
      select
        c.is_nullable = 'NO' as not_null_ok,
        exists (
          select 1
          from information_schema.table_constraints tc
          join information_schema.constraint_column_usage ccu
            on tc.constraint_name = ccu.constraint_name
           and tc.table_schema = ccu.table_schema
          where tc.table_schema = 'public'
            and tc.table_name = 'shop_holidays'
            and tc.constraint_type = 'UNIQUE'
            and ccu.column_name = 'holiday_date'
        ) as unique_ok
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'shop_holidays'
        and c.column_name = 'holiday_date'
      `
    );

    if (result.rowCount === 0) {
      return {
        status: STATUS.FAIL,
        detail: "Column shop_holidays.holiday_date is missing.",
      };
    }

    const row = result.rows[0];
    if (!row.not_null_ok || !row.unique_ok) {
      return {
        status: STATUS.FAIL,
        detail: `Constraint mismatch (NOT NULL=${row.not_null_ok}, UNIQUE=${row.unique_ok}).`,
        meta: row,
      };
    }

    return {
      status: STATUS.PASS,
      detail: "holiday_date keeps NOT NULL + UNIQUE constraint.",
      meta: row,
    };
  });

  const rlsOverview = await runCheck("RLS", "RLS overview by table", async () => {
    const res = await client.query(
      `
      select
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as force_rls,
        coalesce(p.policy_count, 0) as policy_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join (
        select schemaname, tablename, count(*)::int as policy_count
        from pg_policies
        where schemaname = 'public'
        group by schemaname, tablename
      ) p on p.tablename = c.relname and p.schemaname = 'public'
      where n.nspname = 'public'
        and c.relkind = 'r'
      order by c.relname
      `
    );

    return {
      status: STATUS.PASS,
      detail: `Collected RLS metadata for ${res.rows.length} tables.`,
      meta: { rows: res.rows },
    };
  });

  await runCheck("RLS", "RLS strict validation", async () => {
    const rows = rlsOverview.meta?.rows || [];
    const offenders = [];

    for (const row of rows) {
      if (env.rlsExemptTables.has(row.table_name)) continue;
      if (!row.rls_enabled || Number(row.policy_count) === 0) {
        offenders.push(row);
      }
    }

    if (offenders.length === 0) {
      return {
        status: STATUS.PASS,
        detail: "All non-exempt tables have RLS enabled and at least 1 policy.",
      };
    }

    const msg = offenders
      .slice(0, 8)
      .map(
        (o) =>
          `${o.table_name}(rls=${o.rls_enabled}, policies=${o.policy_count})`
      )
      .join(", ");

    return {
      status: env.strictRls ? STATUS.FAIL : STATUS.WARN,
      detail: `RLS gap on ${offenders.length} table(s): ${msg}`,
      meta: { offenders },
    };
  });

  await runCheck("API", "REST health endpoint", async () => {
    const started = performance.now();
    const response = await fetch(`${env.supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
      },
    });
    const latency = toMs(started);
    if (!response.ok) {
      return {
        status: STATUS.FAIL,
        detail: `REST endpoint failed with HTTP ${response.status} (${latency} ms).`,
      };
    }
    return {
      status: STATUS.PASS,
      detail: `REST endpoint reachable in ${latency} ms.`,
    };
  });

  const apiTables = [
    { table: "orders", select: "order_id,created_at", limit: 1 },
    { table: "menu_items", select: "id,name", limit: 1 },
    { table: "erp_inventory_items", select: "id,name", limit: 1 },
    { table: "pinto_meal_plan", select: "id,delivery_date", limit: 1 },
  ];

  for (const target of apiTables) {
    await runCheck("API", `Query ${target.table}`, async () => {
      const url = new URL(`${env.supabaseUrl}/rest/v1/${target.table}`);
      url.searchParams.set("select", target.select);
      url.searchParams.set("limit", String(target.limit));

      const started = performance.now();
      const response = await fetch(url, {
        method: "GET",
        headers: {
          apikey: env.supabaseAnonKey,
          Authorization: `Bearer ${env.supabaseAnonKey}`,
          Accept: "application/json",
        },
      });
      const latency = toMs(started);

      if (!response.ok) {
        const text = await response.text();
        return {
          status: STATUS.FAIL,
          detail: `HTTP ${response.status} (${latency} ms): ${text.slice(0, 200)}`,
        };
      }

      return {
        status: STATUS.PASS,
        detail: `HTTP ${response.status} (${latency} ms).`,
      };
    });
  }

  await runCheck("Jobs", "pg_cron extension", async () => {
    const result = await client.query(
      "select exists(select 1 from pg_extension where extname = 'pg_cron') as installed"
    );
    const installed = result.rows[0].installed === true;
    if (!installed) {
      return {
        status: STATUS.WARN,
        detail: "pg_cron is not installed. Background jobs may be external.",
      };
    }
    return { status: STATUS.PASS, detail: "pg_cron extension is installed." };
  });

  const cronInstalledRes = await client.query(
    "select exists(select 1 from pg_extension where extname = 'pg_cron') as installed"
  );
  if (cronInstalledRes.rows[0].installed === true) {
    await runCheck("Jobs", "Active cron jobs", async () => {
      const jobs = await client.query(
        "select count(*)::int as cnt from cron.job where active = true"
      );
      return {
        status: STATUS.PASS,
        detail: `Active cron jobs: ${jobs.rows[0].cnt}`,
      };
    });

    await runCheck("Jobs", "Recent cron failures (24h)", async () => {
      const failures = await client.query(
        `
        select count(*)::int as cnt
        from cron.job_run_details
        where start_time >= now() - interval '24 hours'
          and status = 'failed'
        `
      );

      const count = failures.rows[0].cnt;
      if (count > 0) {
        return {
          status: STATUS.FAIL,
          detail: `Detected ${count} failed cron runs in the last 24h.`,
        };
      }

      return { status: STATUS.PASS, detail: "No cron failures in last 24h." };
    });
  } else {
    pushCheck({
      section: "Jobs",
      name: "Active cron jobs",
      status: STATUS.SKIP,
      detail: "Skipped because pg_cron is not installed.",
      durationMs: 0,
    });
    pushCheck({
      section: "Jobs",
      name: "Recent cron failures (24h)",
      status: STATUS.SKIP,
      detail: "Skipped because pg_cron is not installed.",
      durationMs: 0,
    });
  }

  await runCheck("Database", "Disabled triggers", async () => {
    const result = await client.query(
      `
      select count(*)::int as cnt
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and not t.tgisinternal
        and t.tgenabled <> 'O'
      `
    );
    const cnt = result.rows[0].cnt;
    if (cnt > 0) {
      return {
        status: STATUS.WARN,
        detail: `${cnt} non-internal triggers are disabled.`,
      };
    }
    return { status: STATUS.PASS, detail: "No disabled business triggers." };
  });

  await runCheck("Database", "Long running queries (> 5 min)", async () => {
    const result = await client.query(
      `
      select count(*)::int as cnt
      from pg_stat_activity
      where state = 'active'
        and now() - query_start > interval '5 minutes'
        and pid <> pg_backend_pid()
      `
    );
    const cnt = result.rows[0].cnt;
    if (cnt > 0) {
      return {
        status: STATUS.WARN,
        detail: `Detected ${cnt} long-running active queries.`,
      };
    }
    return { status: STATUS.PASS, detail: "No long-running active queries." };
  });

  await client.end();

  const summary = {
    total: checks.length,
    pass: checks.filter((c) => c.status === STATUS.PASS).length,
    fail: checks.filter((c) => c.status === STATUS.FAIL).length,
    warn: checks.filter((c) => c.status === STATUS.WARN).length,
    skip: checks.filter((c) => c.status === STATUS.SKIP).length,
  };

  const reportPaths = await writeReports(summary, checks);
  await runCheck("Alert", "Webhook notification", async () =>
    postAlertWebhook(summary, checks, reportPaths.alertPath)
  );

  console.log("\n=== Healthcheck Summary ===");
  console.log(`PASS: ${summary.pass}`);
  console.log(`FAIL: ${summary.fail}`);
  console.log(`WARN: ${summary.warn}`);
  console.log(`SKIP: ${summary.skip}`);
  console.log(`JSON report: ${reportPaths.jsonPath}`);
  console.log(`Markdown report: ${reportPaths.mdPath}`);
  if (reportPaths.hasAlert) {
    console.log(`Alert file: ${reportPaths.alertPath}`);
  }

  if (summary.fail > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Fatal healthcheck error:", error);
  process.exit(2);
});
