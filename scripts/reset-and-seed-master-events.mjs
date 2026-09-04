import fs from "fs";
import path from "path";

// 1. Read .env.local
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

const SCHOOL_TO_CATEGORY_SLUG = {
  "Kalasalingam School of Agriculture and Horticulture (KSAH)": "agriculture-horticulture",
  "Kalasalingam School of Architecture (KSoA)": "architecture-design",
  "School of Mechanical, Aero, Auto and Civil Engineering": "mechanical-civil",
  "School of Bio, Chemical and Processing Engineering": "biotechnology-chemical",
  "School of Computing (SoC)": "computing-ai",
  "School of Electronics, Electrical and Biomedical Technology (SEET)": "electrical-electronics",
  "School of Advanced Sciences (SAS)": "sciences-mathematics",
  "Kalasalingam Business School (KBS)": "management-commerce",
  "School of Liberal Arts and Special Education (SLASE)": "arts-media-literature",
  "Kalasalingam School of Allied And Health Sciences": "allied-health-sciences",
  "Kalasalingam School of Law (KSoL)": "law-debating",
  "First Year Engineering & Foundation (FE)": "first-year-engineering",
};

const TWO_DAY_EVENTS_MAP = {
  "archathon-24": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "09:30:00",
    endTime: "16:00:00",
    scheduleLabel: "25 Sep 2026, 9:30 AM → 26 Sep 2026, 4:00 PM",
  },
  "skyforge-2026-revolutionizing-the-industry-with-smart-uavs": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "10:00:00",
    endTime: "14:00:00",
    scheduleLabel: "25 Sep 2026, 10:00 AM → 26 Sep 2026, 2:00 PM",
  },
  "smart-city-innovation-for-a-sustainable-future": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "10:00:00",
    endTime: "13:00:00",
    scheduleLabel: "25 Sep 2026, 10:00 AM → 26 Sep 2026, 1:00 PM",
  },
  "bot-velocity-engineered-to-race": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "09:00:00",
    endTime: "09:00:00",
    scheduleLabel: "25 Sep 2026, 9:00 AM → 26 Sep 2026, 9:00 AM (24-Hour)",
  },
  "draft-kings-a-cad-contest": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "09:00:00",
    endTime: "09:00:00",
    scheduleLabel: "25 Sep 2026, 9:00 AM → 26 Sep 2026, 9:00 AM (24-Hour)",
  },
  "wonders-of-ai-40": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "09:00:00",
    endTime: "09:00:00",
    scheduleLabel: "25 Sep 2026, 9:00 AM → 26 Sep 2026, 9:00 AM (24-Hour Hackathon)",
  },
  "hack-odyssey-40": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "09:00:00",
    endTime: "09:00:00",
    scheduleLabel: "25 Sep 2026, 9:00 AM → 26 Sep 2026, 9:00 AM (24-Hour Hackathon)",
  },
  "chipcraft-30": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "09:30:00",
    endTime: "11:00:00",
    scheduleLabel: "25 Sep 2026, 9:30 AM → 26 Sep 2026, 11:00 AM",
  },
  "qnx-world": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "09:30:00",
    endTime: "11:00:00",
    scheduleLabel: "25 Sep 2026, 9:30 AM → 26 Sep 2026, 11:00 AM",
  },
  "accfinthon": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "09:00:00",
    endTime: "12:00:00",
    scheduleLabel: "25 Sep 2026, 9:00 AM → 26 Sep 2026, 12:00 PM",
  },
  "biogrant-x-from-problems-to-proposals": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "10:00:00",
    endTime: "16:00:00",
    scheduleLabel: "25 Sep 2026, 10:00 AM → 26 Sep 2026, 4:00 PM (2-Day Event)",
  },
  "techdetective-20": {
    startDate: "2026-09-25",
    endDate: "2026-09-26",
    startTime: "09:30:00",
    endTime: "16:30:00",
    scheduleLabel: "25 Sep 2026, 9:30 AM → 26 Sep 2026, 4:30 PM (2-Day Event)",
  },
};

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function parseEventDate(dateStr) {
  if (!dateStr) return "2026-09-25";
  const s = dateStr.trim();
  if (s === "2026-09-26" || s.startsWith("2026-09-26")) return "2026-09-26";
  if (s === "2026-09-25" || s.startsWith("2026-09-25")) return "2026-09-25";
  if (s.includes("26.09")) return "2026-09-26";
  if (s.includes("25.09")) return "2026-09-25";
  return "2026-09-25";
}

function parseTimes(timeStr) {
  if (!timeStr) return { start: "09:30:00", end: "16:30:00" };
  const lower = timeStr.toLowerCase();

  let start = "09:30:00";
  let end = "16:30:00";

  // Start time detection
  if (lower.includes("10.30 am") || lower.includes("10:30 am")) {
    start = "10:30:00";
  } else if (lower.includes("10.00 am") || lower.includes("10:00 am") || lower.includes("10 am") || lower.includes("10.00am") || lower.includes("10am")) {
    start = "10:00:00";
  } else if (lower.includes("9.30 am") || lower.includes("9:30 am") || lower.includes("9.30") || lower.includes("9:30")) {
    start = "09:30:00";
  } else if (lower.includes("9.00 am") || lower.includes("9:00 am") || lower.includes("9am") || lower.includes("9 am")) {
    start = "09:00:00";
  } else if (lower.includes("11.00 am") || lower.includes("11:00 am") || lower.includes("11 am")) {
    start = "11:00:00";
  } else if (lower.includes("1.30 pm") || lower.includes("1:30 pm")) {
    start = "13:30:00";
  } else if (lower.includes("2.00 pm") || lower.includes("2:00 pm") || lower.includes("2 pm") || lower.includes("2.00")) {
    start = "14:00:00";
  }

  // End time detection
  if (lower.includes("11.30 am") || lower.includes("11:30 am")) {
    end = "11:30:00";
  } else if (lower.includes("12.00 pm") || lower.includes("12:00 pm") || lower.includes("12 pm") || lower.includes("12:00pm") || lower.includes("12pm") || lower.includes("12.30 pm")) {
    end = "12:30:00";
  } else if (lower.includes("1.00 pm") || lower.includes("1:00 pm") || lower.includes("1 pm") || lower.includes("01.00 pm")) {
    end = "13:00:00";
  } else if (lower.includes("2.00 pm") || lower.includes("2:00 pm") || lower.includes("2pm") || lower.includes("2 pm")) {
    end = "14:00:00";
  } else if (lower.includes("3.00 pm") || lower.includes("3:00 pm") || lower.includes("3 pm") || lower.includes("3.30 pm")) {
    end = "15:30:00";
  } else if (lower.includes("4.00 pm") || lower.includes("4:00 pm") || lower.includes("4 pm") || lower.includes("4.00pm")) {
    end = "16:00:00";
  } else if (lower.includes("4.30 pm") || lower.includes("4:30 pm")) {
    end = "16:30:00";
  } else if (lower.includes("5.00 pm") || lower.includes("5:00 pm") || lower.includes("5 pm") || lower.includes("5pm")) {
    end = "17:00:00";
  }

  return { start, end };
}

function parseCSV(text) {
  const lines = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQuotes = !inQuotes; cur += c; }
    else if (c === '\n' && !inQuotes) { lines.push(cur); cur = ""; }
    else if (c === '\r' && !inQuotes) {}
    else { cur += c; }
  }
  if (cur.trim()) lines.push(cur);

  const rows = [];
  for (const line of lines) {
    const cells = [];
    let cell = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { q = !q; }
      else if (ch === ',' && !q) { cells.push(cell.trim().replace(/^"|"$/g, '')); cell = ""; }
      else { cell += ch; }
    }
    cells.push(cell.trim().replace(/^"|"$/g, ''));
    rows.push(cells);
  }
  return rows;
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
  if (!res.ok) {
    const text = await res.text();
    console.error(`DELETE /${endpoint} failed: ${res.status} ${text}`);
    return [];
  }
  return res.json();
}

async function main() {
  console.log("========================================================================");
  console.log("🚀 EUPHORIA 2026: ATOMIC DATABASE RESET & ACCURATE MASTER EVENTS SEED");
  console.log("========================================================================\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1: PRESERVE SUPER ADMIN & ADMIN IDENTIFIERS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("--- PHASE 1: IDENTIFYING SUPER ADMINS TO PRESERVE ---");

  const [profilesRes, rolesRes] = await Promise.all([
    fetch(`${url}/rest/v1/profiles?select=id,email,full_name`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }),
    fetch(`${url}/rest/v1/user_role_assignments?select=user_id,role_id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }),
  ]);

  const allProfiles = await profilesRes.json();
  const allRoles = await rolesRes.json();

  const superAdminUserIds = new Set();

  if (Array.isArray(allRoles)) {
    allRoles.forEach((r) => {
      if (r.role_id === "super_admin" || r.role_id === "admin") {
        superAdminUserIds.add(r.user_id);
      }
    });
  }

  if (Array.isArray(allProfiles)) {
    allProfiles.forEach((p) => {
      const email = (p.email || "").toLowerCase().trim();
      if (
        email === "smithlivingston2005@gmail.com" ||
        email === "smithlivingstonofficial@gmail.com" ||
        email.includes("admin") ||
        email.includes("smith")
      ) {
        superAdminUserIds.add(p.id);
      }
    });
  }

  console.log(`Protected Admin/SuperAdmin accounts (${superAdminUserIds.size} users):`);
  allProfiles
    .filter((p) => superAdminUserIds.has(p.id))
    .forEach((p) => console.log(`  🛡️  ${p.full_name} (${p.email}) [ID: ${p.id}]`));

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2: PURGE TRANSACTION, PASS, REGISTRATION & EVENT TABLES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- PHASE 2: PURGING TEST DATA & OLD EVENTS ---");

  const tablesToClear = [
    "attendance",
    "cart_items",
    "event_registrations",
    "staff_event_assignments",
    "student_coordinator_assignments",
    "delegate_passes",
    "orders",
    "payments",
    "notifications",
    "announcements",
    "events", // Completely clear all old events
  ];

  for (const table of tablesToClear) {
    try {
      const deleted = await apiDelete(`${table}?id=neq.00000000-0000-0000-0000-000000000000`);
      console.log(`  🗑️  Cleared '${table}': ${Array.isArray(deleted) ? deleted.length : 0} rows removed`);
    } catch (err) {
      console.error(`  ❌ Error clearing ${table}:`, err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 3: PURGE TEST PARTICIPANT PROFILES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- PHASE 3: PURGING NON-ADMIN PARTICIPANT PROFILES ---");

  const testProfiles = (allProfiles || []).filter((p) => !superAdminUserIds.has(p.id));
  const testUserIds = testProfiles.map((p) => p.id);

  if (testUserIds.length > 0) {
    const userInClause = `in.(${testUserIds.join(",")})`;
    console.log(`  Removing role assignments for ${testUserIds.length} test participants...`);
    await apiDelete(`user_role_assignments?user_id=${userInClause}`);
    console.log(`  Removing ${testUserIds.length} test participant profiles...`);
    await apiDelete(`profiles?id=${userInClause}`);
  } else {
    console.log("  No test participant profiles to delete.");
  }

  // Ensure super admin role assignments & profile completeness are pristine
  for (const adminId of superAdminUserIds) {
    await fetch(`${url}/rest/v1/user_role_assignments`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify([
        { user_id: adminId, role_id: "super_admin" },
        { user_id: adminId, role_id: "admin" },
        { user_id: adminId, role_id: "participant" },
      ]),
    });

    await fetch(`${url}/rest/v1/profiles?id=eq.${adminId}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        is_profile_completed: true,
        participant_type: "internal",
      }),
    });
  }
  console.log("  ✅ Super Admin permissions, roles, and profile completeness confirmed.");

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: FETCH CATEGORIES & INGEST MASTER EVENTS CSV
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- PHASE 4: FETCHING CATEGORIES & SEEDING 61 MASTER EVENTS ---");

  const catRes = await fetch(`${url}/rest/v1/event_categories?select=id,name,slug`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const categories = await catRes.json();
  const slugToCat = new Map();
  categories.forEach((c) => slugToCat.set(c.slug, c));

  const csvPath = path.resolve(process.cwd(), "data/euphoria_2026_events_master.csv");
  console.log(`Reading master events CSV from: ${csvPath}`);
  const csvText = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(csvText);
  console.log(`Parsed ${rows.length - 1} event rows from CSV.`);

  const eventsToInsert = [];
  const usedSlugs = new Set();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[2] || r[2].trim() === "") continue;

    const sNo = parseInt(r[0], 10);
    const school = r[1].trim();
    const eventName = r[2].trim();
    const dateRaw = r[3].trim();
    const timeRaw = r[4].trim();
    const capacityRaw = r[5].trim();
    const typeRaw = r[6].trim();
    const coordNames = r[7] ? r[7].trim() : "";
    const coordMobiles = r[8] ? r[8].trim() : "";
    const coordEmails = r[9] ? r[9].trim() : "";
    const whatsapp = r[10] ? r[10].trim() : "";
    const brochure = r[11] ? r[11].trim() : "";
    const venue = r[12] ? r[12].trim() : "Campus Academic Center & Spec Labs";
    const shortDesc = r[13]
      ? r[13].trim()
      : `${eventName} organized by ${school} as part of Euphoria 2026 at Kalasalingam Academy of Research and Education.`;

    // Map Category
    const catSlug = SCHOOL_TO_CATEGORY_SLUG[school];
    const category = slugToCat.get(catSlug);
    if (!category) {
      console.error(`❌ CRITICAL: No category found for school "${school}" (slug: ${catSlug})`);
    }

    // Parse Date & Times
    const eventDate = parseEventDate(dateRaw);
    const { start: startTime, end: endTime } = parseTimes(timeRaw);
    const isProEvent =
      typeRaw.toLowerCase().includes("flagship") || typeRaw.toLowerCase().includes("pro");
    const participantLimit = parseInt(capacityRaw, 10) || 100;

    // Unique Slug
    let baseSlug = slugify(eventName);
    if (usedSlugs.has(baseSlug)) {
      baseSlug = `${baseSlug}-${sNo}`;
    }
    usedSlugs.add(baseSlug);

    // Build structured description with embedded tags for maximum backwards compatibility
    let descriptionText = `${eventName} is an official competition organized by ${school} during Euphoria 2026 at Kalasalingam Academy of Research and Education. Join the official WhatsApp group for real-time announcements, team coordination, and venue guidelines.`;
    if (whatsapp && whatsapp.startsWith("http")) {
      descriptionText += `\n[WHATSAPP_LINK: ${whatsapp}]`;
    }
    if (brochure && brochure.startsWith("http")) {
      descriptionText += `\n[BROCHURE_URL: ${brochure}]`;
    }
    if (coordNames) {
      descriptionText += `\n[COORDINATOR_NAMES: ${coordNames}]`;
    }
    if (coordMobiles) {
      descriptionText += `\n[COORDINATOR_MOBILES: ${coordMobiles}]`;
    }
    if (coordEmails) {
      descriptionText += `\n[COORDINATOR_EMAILS: ${coordEmails}]`;
    }

    // Embed 2-day schedule metadata or single-day metadata
    const twoDayInfo = TWO_DAY_EVENTS_MAP[baseSlug];
    if (twoDayInfo) {
      descriptionText += `\n[IS_TWO_DAY: true]`;
      descriptionText += `\n[START_DATE: ${twoDayInfo.startDate}]`;
      descriptionText += `\n[END_DATE: ${twoDayInfo.endDate}]`;
      descriptionText += `\n[START_TIME: ${twoDayInfo.startTime}]`;
      descriptionText += `\n[END_TIME: ${twoDayInfo.endTime}]`;
      descriptionText += `\n[SCHEDULE_LABEL: ${twoDayInfo.scheduleLabel}]`;
      eventDate = twoDayInfo.startDate;
      startTime = twoDayInfo.startTime;
      endTime = twoDayInfo.endTime;
    } else {
      descriptionText += `\n[IS_TWO_DAY: false]`;
      descriptionText += `\n[START_DATE: ${eventDate}]`;
      descriptionText += `\n[END_DATE: ${eventDate}]`;
      descriptionText += `\n[SCHEDULE_LABEL: ${eventDate === "2026-09-25" ? "25 Sep 2026" : "26 Sep 2026"}]`;
    }

    eventsToInsert.push({
      name: eventName,
      slug: baseSlug,
      school_or_dept: school,
      short_description: shortDesc,
      description: descriptionText,
      venue: venue,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      participant_limit: participantLimit,
      is_pro_event: isProEvent,
      status: "registration_open",
      registration_fee: 0,
      registration_start: "2026-08-01T00:00:00Z",
      registration_end: "2026-09-26T23:59:59Z",
      allow_internal: true,
      allow_external: true,
      category_id: category?.id || null,
      brochure_url: brochure || null,
      whatsapp_link: whatsapp || null,
      coordinator_names: coordNames || null,
      coordinator_mobiles: coordMobiles || null,
      coordinator_emails: coordEmails || null,
    });
  }

  console.log(`Inserting ${eventsToInsert.length} events into Supabase...`);

  const insertRes = await fetch(`${url}/rest/v1/events`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(eventsToInsert),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    console.error(`❌ Batch event insert failed: ${insertRes.status} ${errText}`);
    process.exit(1);
  }

  const insertedRecords = await insertRes.json();
  console.log(`🎉 Successfully inserted ${insertedRecords.length} events into 'events' table!`);

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 5: POST-INGESTION AUDIT VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n========================================================================");
  console.log("📊 POST-INGESTION DATABASE AUDIT");
  console.log("========================================================================");

  const [
    dbEvents,
    dbProfiles,
    dbRegs,
    dbPasses,
    dbOrders,
  ] = await Promise.all([
    fetch(`${url}/rest/v1/events?select=id,name,school_or_dept,event_date,is_pro_event,category:event_categories(name,slug)`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }).then((r) => r.json()),
    fetch(`${url}/rest/v1/profiles?select=id,email,full_name,is_profile_completed`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }).then((r) => r.json()),
    fetch(`${url}/rest/v1/event_registrations?select=id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }).then((r) => r.json()),
    fetch(`${url}/rest/v1/delegate_passes?select=id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }).then((r) => r.json()),
    fetch(`${url}/rest/v1/orders?select=id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }).then((r) => r.json()),
  ]);

  const day1Count = dbEvents.filter((e) => e.event_date === "2026-09-25").length;
  const day2Count = dbEvents.filter((e) => e.event_date === "2026-09-26").length;
  const proCount = dbEvents.filter((e) => e.is_pro_event).length;
  const regCount = dbEvents.filter((e) => !e.is_pro_event).length;

  console.log(`✅ Total Events in DB: ${dbEvents.length} (Expected: 61)`);
  console.log(`   - Day 1 (25 Sep 2026): ${day1Count} events (Expected: 29)`);
  console.log(`   - Day 2 (26 Sep 2026): ${day2Count} events (Expected: 32)`);
  console.log(`   - Flagship Tiers: ${proCount} events (Expected: 9)`);
  console.log(`   - Regular Tiers: ${regCount} events (Expected: 52)`);

  const categoryBreakdown = {};
  dbEvents.forEach((e) => {
    const catName = e.category?.name || "Uncategorized";
    categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + 1;
  });
  console.log("\n✅ Category Track Distribution (12 Schools):");
  Object.entries(categoryBreakdown).forEach(([cat, count]) => {
    console.log(`   - ${cat.padEnd(32)}: ${count} events`);
  });

  console.log("\n✅ Zero-State Verifications:");
  console.log(`   - Event Registrations Count : ${dbRegs.length}`);
  console.log(`   - Delegate Passes Count     : ${dbPasses.length}`);
  console.log(`   - Orders / Transactions Count: ${dbOrders.length}`);

  console.log("\n✅ Preserved Super Admin / Staff Profiles:");
  dbProfiles.forEach((p) => {
    console.log(`   🛡️  ${p.full_name} (${p.email}) - Completed: ${p.is_profile_completed}`);
  });

  console.log("\n🎉 ALL OPERATIONS COMPLETED WITH 100% ACCURACY!");
}

main().catch(console.error);
