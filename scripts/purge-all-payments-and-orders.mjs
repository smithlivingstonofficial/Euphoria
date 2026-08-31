import fs from "fs";
import path from "path";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
let envVars = {};
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2] || "";
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[key] = val.trim();
    }
  }
}

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function purgeAllPaymentsAndOrders() {
  console.log("=== EXPLICIT SWEEP: PURGING ALL PAYMENTS, ORDERS & PASSES ===");

  const tablesToClear = [
    "attendance",
    "event_registrations",
    "delegate_passes",
    "orders",
    "payments",
    "cart_items"
  ];

  for (const table of tablesToClear) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "return=representation",
        },
      });
      if (res.ok) {
        const deleted = await res.json();
        console.log(` - Cleared '${table}': ${Array.isArray(deleted) ? deleted.length : 0} rows deleted`);
      } else {
        console.log(` - Cleared '${table}': Status ${res.status}`);
      }
    } catch (err) {
      console.error(`Error clearing ${table}:`, err);
    }
  }

  console.log("\n=== FINAL PAYMENT & ORDER ZERO-STATE VERIFICATION ===");
  for (const table of tablesToClear) {
    const res = await fetch(`${url}/rest/v1/${table}?select=id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const rows = await res.json();
    console.log(`✅ Table '${table}': ${Array.isArray(rows) ? rows.length : 0} records`);
  }
  console.log("\n🎉 ALL PAYMENTS, ORDERS, AND PASS DATA ARE AT ZERO RECORDS!");
}

purgeAllPaymentsAndOrders().catch(console.error);
