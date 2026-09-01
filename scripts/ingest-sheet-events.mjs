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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const SCHOOL_MAP = {
  "SoC": "School of Computing (SoC)",
  "SCSE": "School of Computing (SoC)",
  "SEET": "School of Electronics, Electrical and Biomedical Technology (SEET)",
  "SMACE": "School of Mechanical, Aero, Auto and Civil Engineering",
  "KBS": "Kalasalingam Business School (KBS)",
  "SAS": "School of Advanced Sciences (SAS)",
  "SLASE": "School of Liberal Arts and Special Education (SLASE)",
  "AHS": "Kalasalingam School of Allied And Health Sciences",
  "KSoL": "Kalasalingam School of Law (KSoL)",
  "KSL": "Kalasalingam School of Law (KSoL)",
  "FE": "First Year Engineering & Foundation (FE)",
  "KSAH": "Kalasalingam School of Agriculture and Horticulture (KSAH)",
  "KSA": "Kalasalingam School of Architecture (KSoA)",
  "KSoA": "Kalasalingam School of Architecture (KSoA)",
  "SBCE": "School of Bio, Chemical and Processing Engineering",
  "Nursing": "Kalasalingam School of Allied And Health Sciences",
  "Physiotherapy": "Kalasalingam School of Allied And Health Sciences",
};

function canonicalSchoolName(abbr) {
  if (!abbr) return "General Technical";
  const clean = abbr.trim();
  if (SCHOOL_MAP[clean]) return SCHOOL_MAP[clean];
  for (const [k, v] of Object.entries(SCHOOL_MAP)) {
    if (clean.toUpperCase().includes(k.toUpperCase())) return v;
  }
  return clean;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function parseDate(dateStr) {
  if (!dateStr) return "2026-09-25";
  if (dateStr.includes("26.09")) return "2026-09-26";
  return "2026-09-25";
}

function parseTimes(timeStr) {
  if (!timeStr) return { start: "09:30:00", end: "16:30:00" };
  const lower = timeStr.toLowerCase();
  
  let start = "09:30:00";
  let end = "16:30:00";

  if (lower.includes("10.00 am") || lower.includes("10:00 am") || lower.includes("10 am")) {
    start = "10:00:00";
  } else if (lower.includes("9.00 am") || lower.includes("9am") || lower.includes("9.30 am")) {
    start = "09:30:00";
  } else if (lower.includes("1.30 pm") || lower.includes("2.00 pm") || lower.includes("2 pm")) {
    start = "14:00:00";
  }

  if (lower.includes("1.00 pm") || lower.includes("12 pm") || lower.includes("12.00 pm")) {
    end = "13:00:00";
  } else if (lower.includes("4.00 pm") || lower.includes("4.30 pm") || lower.includes("4 pm") || lower.includes("5.00 pm") || lower.includes("5pm")) {
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
    if (c === '"') {
      inQuotes = !inQuotes;
      cur += c;
    } else if (c === '\n' && !inQuotes) {
      lines.push(cur);
      cur = "";
    } else if (c === '\r' && !inQuotes) {
      // ignore
    } else {
      cur += c;
    }
  }
  if (cur.trim()) lines.push(cur);

  const rows = [];
  for (const line of lines) {
    const cells = [];
    let cell = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        q = !q;
      } else if (ch === ',' && !q) {
        cells.push(cell.trim().replace(/^"|"$/g, ''));
        cell = "";
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim().replace(/^"|"$/g, ''));
    rows.push(cells);
  }

  return rows;
}

async function runIngestion() {
  const localCsvPath = path.resolve(process.cwd(), "data/euphoria_2026_events_master.csv");
  let csvText = "";

  if (fs.existsSync(localCsvPath)) {
    console.log("Reading local master CSV file data/euphoria_2026_events_master.csv...");
    csvText = fs.readFileSync(localCsvPath, "utf8");
  } else {
    console.log("Fetching Google Sheet CSV...");
    const csvUrl = "https://docs.google.com/spreadsheets/d/1-cwST2mPp6Khh4A45jLySg5kKqUbkXeMt2vlqylLR6Y/export?format=csv";
    const resp = await fetch(csvUrl);
    if (!resp.ok) {
      throw new Error(`Failed to fetch CSV: ${resp.statusText}`);
    }
    csvText = await resp.text();
  }

  const rows = parseCSV(csvText);
  console.log(`Parsed ${rows.length} total rows from CSV.`);

  const header = rows[0] || [];
  const brochureColIndex = header.findIndex((h) => h.toLowerCase().includes("brochure"));

  const catRes = await fetch(`${url}/rest/v1/event_categories?select=id,name,slug`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  const categories = await catRes.json();

  let currentSchool = "General Technical";
  let updatedCount = 0;
  let insertedCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const sNo = row[0];
    let schoolAbbr = row[1];
    const eventName = row[2];
    const eventDateRaw = row[3];
    const eventTimeRaw = row[4];
    const targetCountRaw = row[5];
    const eventTypeRaw = row[6];
    const coordNames = row[7] || "";
    const coordMobiles = row[8] || "";
    const coordEmails = row[9] || "";
    const whatsappLink = row[10] || "";
    const brochureLink = brochureColIndex !== -1 ? row[brochureColIndex] || "" : "";

    if (!eventName || eventName.trim() === "") continue;

    if (schoolAbbr && schoolAbbr.trim() !== "") {
      currentSchool = canonicalSchoolName(schoolAbbr);
    }

    const isProEvent = (eventTypeRaw || "").toLowerCase().includes("flagship") || (eventTypeRaw || "").toLowerCase().includes("pro");
    const eventDate = parseDate(eventDateRaw);
    const { start: startTime, end: endTime } = parseTimes(eventTimeRaw);
    const participantLimit = parseInt(targetCountRaw, 10) || 100;
    const baseSlug = slugify(eventName);

    let matchedCat = categories.find(c => c.name.toLowerCase().includes(currentSchool.split(" ")[0].toLowerCase())) || categories[0];

    let descriptionText = `${eventName.trim()} is an official competition organized by ${currentSchool} during Euphoria 2026 at Kalasalingam Academy of Research and Education. Join the official WhatsApp group for real-time announcements, team coordination, and venue guidelines.`;

    if (whatsappLink && whatsappLink.trim().startsWith("http")) {
      descriptionText += `\n[WHATSAPP_LINK: ${whatsappLink.trim()}]`;
    }
    if (brochureLink && brochureLink.trim().startsWith("http")) {
      descriptionText += `\n[BROCHURE_URL: ${brochureLink.trim()}]`;
    }
    if (coordNames && coordNames.trim()) {
      descriptionText += `\n[COORDINATOR_NAMES: ${coordNames.trim()}]`;
    }
    if (coordMobiles && coordMobiles.trim()) {
      descriptionText += `\n[COORDINATOR_MOBILES: ${coordMobiles.trim()}]`;
    }
    if (coordEmails && coordEmails.trim()) {
      descriptionText += `\n[COORDINATOR_EMAILS: ${coordEmails.trim()}]`;
    }

    const checkRes = await fetch(`${url}/rest/v1/events?select=id,slug&name=eq.${encodeURIComponent(eventName.trim())}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    const existing = await checkRes.json();

    const payload = {
      name: eventName.trim(),
      slug: baseSlug,
      school_or_dept: currentSchool,
      short_description: `${eventName.trim()} organized by ${currentSchool} as part of Euphoria 2026 at Kalasalingam Academy of Research and Education.`,
      description: descriptionText,
      venue: "Campus Academic Center & Spec Labs",
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
      category_id: matchedCat?.id || null,
      brochure_url: brochureLink.trim() || null,
    };

    if (Array.isArray(existing) && existing.length > 0) {
      const targetId = existing[0].id;
      const updateRes = await fetch(`${url}/rest/v1/events?id=eq.${targetId}`, {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });

      if (updateRes.ok) {
        updatedCount++;
      } else {
        const errText = await updateRes.text();
        console.error(`Failed to update ${eventName}: ${updateRes.status} ${errText}`);
      }
    } else {
      const insertRes = await fetch(`${url}/rest/v1/events`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });

      if (insertRes.ok) {
        insertedCount++;
      } else {
        const errText = await insertRes.text();
        console.error(`Failed to insert ${eventName}: ${insertRes.status} ${errText}`);
      }
    }
  }

  console.log(`\n🎉 INGESTION COMPLETE!`);
  console.log(`Updated: ${updatedCount} events`);
  console.log(`Inserted: ${insertedCount} events`);
}

runIngestion().catch(console.error);
