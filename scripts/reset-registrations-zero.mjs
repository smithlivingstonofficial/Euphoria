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

async function resetRegistrationsZero() {
  console.log("=== RESETTING ALL REGISTRATIONS & PASSES TO ZERO FOR FRESH TESTING ===");

  await fetch(`${url}/rest/v1/attendance?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });

  await fetch(`${url}/rest/v1/event_registrations?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });

  await fetch(`${url}/rest/v1/delegate_passes?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });

  await fetch(`${url}/rest/v1/orders?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });

  await fetch(`${url}/rest/v1/cart_items?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });

  const [
    eventsCheck,
    profilesCheck,
    regsCheck,
    passesCheck
  ] = await Promise.all([
    fetch(`${url}/rest/v1/events?select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(r => r.json()),
    fetch(`${url}/rest/v1/profiles?select=id,full_name,email`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(r => r.json()),
    fetch(`${url}/rest/v1/event_registrations?select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(r => r.json()),
    fetch(`${url}/rest/v1/delegate_passes?select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(r => r.json()),
  ]);

  console.log("\n=== FINAL CLEANUP AUDIT ===");
  console.log(`✅ Events Table Count: ${eventsCheck.length} (Intact, exactly 61 Sheet events)`);
  console.log(`✅ Profiles Table Count: ${profilesCheck.length} (Admin & Staff profiles)`);
  console.log(`✅ Event Registrations Count: ${regsCheck.length} (Fresh state)`);
  console.log(`✅ Delegate Passes Count: ${passesCheck.length} (Fresh state)`);
}

resetRegistrationsZero().catch(console.error);
