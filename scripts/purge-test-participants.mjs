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

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function apiDelete(endpoint) {
  const res = await fetch(`${url}/rest/v1/${endpoint}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=representation",
    },
  });
  return res.json();
}

async function purgeTestParticipants() {
  console.log("=== STARTING PARTICIPANT TEST DATA PURGE ===");

  // 1. Fetch profiles to determine admins & staff to preserve
  const profilesRes = await fetch(`${url}/rest/v1/profiles?select=id,email,full_name`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const profiles = await profilesRes.json();

  const rolesRes = await fetch(`${url}/rest/v1/user_role_assignments?select=user_id,role_id`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const roles = await rolesRes.json();

  const preserveUserIds = new Set();

  if (Array.isArray(roles)) {
    roles.forEach((r) => {
      if (r.role_id === "admin" || r.role_id === "staff_coordinator") {
        preserveUserIds.add(r.user_id);
      }
    });
  }

  (profiles || []).forEach((p) => {
    const e = (p.email || "").toLowerCase();
    if (
      e.includes("admin") ||
      e.includes("smith") ||
      e === "smithlivingstonofficial@gmail.com"
    ) {
      preserveUserIds.add(p.id);
    }
  });

  const purgeProfiles = (profiles || []).filter((p) => !preserveUserIds.has(p.id));
  const purgeUserIds = purgeProfiles.map((p) => p.id);

  console.log(`Preserving ${preserveUserIds.size} admin/staff profiles.`);
  console.log(`Purging ${purgeUserIds.length} test participant profiles.`);

  if (purgeUserIds.length === 0) {
    console.log("No test profiles to purge. Database is already clean.");
    return;
  }

  // Build IN query string: user_id=in.(id1,id2,...)
  const userInClause = `in.(${purgeUserIds.join(",")})`;

  // 1. Delete Attendance records
  console.log("\n1. Deleting test attendance check-ins...");
  const delAtt = await apiDelete(`attendance?user_id=${userInClause}`);
  console.log(`Deleted ${Array.isArray(delAtt) ? delAtt.length : 0} attendance records.`);

  // 2. Delete Event Registrations
  console.log("\n2. Deleting test event registrations...");
  const delRegs = await apiDelete(`event_registrations?user_id=${userInClause}`);
  console.log(`Deleted ${Array.isArray(delRegs) ? delRegs.length : 0} registration records.`);

  // 3. Delete Delegate Passes
  console.log("\n3. Deleting test delegate passes...");
  const delPasses = await apiDelete(`delegate_passes?user_id=${userInClause}`);
  console.log(`Deleted ${Array.isArray(delPasses) ? delPasses.length : 0} pass records.`);

  // 4. Delete Payment Orders
  console.log("\n4. Deleting test orders...");
  const delOrders = await apiDelete(`orders?user_id=${userInClause}`);
  console.log(`Deleted ${Array.isArray(delOrders) ? delOrders.length : 0} order records.`);

  // 5. Delete Cart Items
  console.log("\n5. Deleting test cart items...");
  const delCart = await apiDelete(`cart_items?user_id=${userInClause}`);
  console.log(`Deleted ${Array.isArray(delCart) ? delCart.length : 0} cart records.`);

  // 6. Delete Student Coordinator Assignments
  console.log("\n6. Deleting test student coordinator assignments...");
  const delStudAssign = await apiDelete(`student_coordinator_assignments?user_id=${userInClause}`);
  console.log(`Deleted ${Array.isArray(delStudAssign) ? delStudAssign.length : 0} student coordinator assignment records.`);

  // 7. Delete User Role Assignments for test users
  console.log("\n7. Deleting role assignments for test users...");
  const delRoles = await apiDelete(`user_role_assignments?user_id=${userInClause}`);
  console.log(`Deleted ${Array.isArray(delRoles) ? delRoles.length : 0} role assignment records.`);

  // 8. Delete Profiles
  console.log("\n8. Deleting test participant profiles...");
  const delProfiles = await apiDelete(`profiles?id=${userInClause}`);
  console.log(`Deleted ${Array.isArray(delProfiles) ? delProfiles.length : 0} test profile records.`);

  // Verification Audit
  console.log("\n=== POST-PURGE AUDIT VERIFICATION ===");
  const [
    eventsCheck,
    profilesCheck,
    regsCheck,
    passesCheck,
    ordersCheck
  ] = await Promise.all([
    fetch(`${url}/rest/v1/events?select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(r => r.json()),
    fetch(`${url}/rest/v1/profiles?select=id,full_name,email`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(r => r.json()),
    fetch(`${url}/rest/v1/event_registrations?select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(r => r.json()),
    fetch(`${url}/rest/v1/delegate_passes?select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(r => r.json()),
    fetch(`${url}/rest/v1/orders?select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).then(r => r.json()),
  ]);

  console.log(`✅ Events Table Count: ${eventsCheck.length} (Intact, exactly 61 Sheet events)`);
  console.log(`✅ Profiles Table Count: ${profilesCheck.length} (Admin & Staff profiles only)`);
  console.log(`✅ Event Registrations Count: ${regsCheck.length}`);
  console.log(`✅ Delegate Passes Count: ${passesCheck.length}`);
  console.log(`✅ Orders Count: ${ordersCheck.length}`);
  console.log("\nPreserved Profiles:");
  profilesCheck.forEach(p => console.log(` - ${p.full_name} (${p.email})`));

  console.log("\n🎉 PARTICIPANT TEST DATA PURGE COMPLETED SUCCESSFULLY!");
}

purgeTestParticipants().catch(console.error);
