import fs from "fs";

const envLocal = fs.readFileSync(".env.local", "utf-8");
const env = {};
envLocal.split("\n").forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || "";
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation"
};

async function sync() {
  console.log("=== SYNCING COORDINATORS TO EXACT SINGLE EVENTS ===");

  // 1. Fetch current staff_event_assignments
  const currRes = await fetch(`${url}/rest/v1/staff_event_assignments?select=id,event_id,user_id`, { headers });
  const currAssignments = await currRes.json();
  const existingKeys = new Set(currAssignments.map(a => `${a.user_id}_${a.event_id}`));
  const usersWithAssignment = new Set(currAssignments.map(a => a.user_id));

  // 2. Fetch all profiles and events
  const [profRes, evtRes] = await Promise.all([
    fetch(`${url}/rest/v1/profiles?select=id,full_name,email,department`, { headers }),
    fetch(`${url}/rest/v1/events?select=id,name,description,school_or_dept`, { headers })
  ]);
  const profiles = await profRes.json();
  const events = await evtRes.json();

  const profileByEmail = new Map();
  profiles.forEach(p => {
    if (p.email) profileByEmail.set(p.email.toLowerCase().trim(), p);
  });

  const toInsert = [];

  // Match each event's [COORDINATOR_EMAILS:] to existing registered profiles
  for (const evt of events) {
    if (!evt.description || !evt.description.includes("[COORDINATOR_EMAILS:")) continue;
    const match = evt.description.match(/\[COORDINATOR_EMAILS:\s*([^\]]+)\]/);
    if (!match) continue;

    const emails = match[1].split(/,|&|\//).map(e => e.trim().toLowerCase()).filter(Boolean);
    for (const email of emails) {
      const prof = profileByEmail.get(email);
      if (prof) {
        // Check if already assigned
        if (usersWithAssignment.has(prof.id)) {
          console.log(`User ${prof.full_name} (${email}) already assigned.`);
          continue;
        }

        const key = `${prof.id}_${evt.id}`;
        if (!existingKeys.has(key)) {
          toInsert.push({
            user_id: prof.id,
            event_id: evt.id,
            assigned_name: prof.full_name,
            event_name: evt.name
          });
          usersWithAssignment.add(prof.id);
          existingKeys.add(key);
        }
      }
    }
  }

  console.log(`Found ${toInsert.length} coordinator-to-event assignments to insert into staff_event_assignments:`);
  for (const item of toInsert) {
    console.log(`  -> ${item.assigned_name} assigned to: ${item.event_name}`);
    const insertRes = await fetch(`${url}/rest/v1/staff_event_assignments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: item.user_id,
        event_id: item.event_id
      })
    });
    if (!insertRes.ok) {
      console.error("Failed to insert:", await insertRes.text());
    } else {
      console.log("     ✓ Successfully created DB record in staff_event_assignments");
    }

    // Also ensure user_role_assignments has staff_coordinator role
    await fetch(`${url}/rest/v1/user_role_assignments`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({
        user_id: item.user_id,
        role_id: "staff_coordinator"
      })
    });
  }

  console.log("Sync complete!");
}

sync().catch(console.error);
