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

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          cell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(cell.trim());
        cell = "";
      } else if (c === '\n') {
        row.push(cell.trim());
        if (row.some(x => x.length > 0)) rows.push(row);
        row = [];
        cell = "";
      } else if (c === '\r') {
        // ignore CR
      } else {
        cell += c;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some(x => x.length > 0)) rows.push(row);
  }

  return rows;
}

async function updateDatabase() {
  const csvPath = path.resolve(process.cwd(), "data/euphoria_2026_events_master.csv");
  const rawText = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(rawText);

  console.log(`Parsed ${rows.length - 1} events from master CSV.`);

  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const [
      sNo,
      school,
      eventName,
      eventDate,
      eventTime,
      targetCapacity,
      eventType,
      coordNames,
      coordMobiles,
      coordEmails,
      whatsappLink,
      brochureLink,
      venue,
      shortDescription
    ] = rows[i];

    if (!eventName) continue;

    // Fetch existing event from DB
    const res = await fetch(`${url}/rest/v1/events?select=id,name,description,school_or_dept&name=eq.${encodeURIComponent(eventName.trim())}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      }
    });

    if (!res.ok) {
      console.error(`Failed to find event: ${eventName} (${res.status})`);
      errorCount++;
      continue;
    }

    const matched = await res.json();
    if (!matched || matched.length === 0) {
      console.warn(`Event not found in DB: "${eventName}"`);
      errorCount++;
      continue;
    }

    const eventRecord = matched[0];
    let updatedDescription = eventRecord.description || "";
    
    // Replace old school in description text if present
    const descRegex = /organized by (.*?) during Euphoria 2026/;
    if (descRegex.test(updatedDescription)) {
      updatedDescription = updatedDescription.replace(descRegex, `organized by ${school} during Euphoria 2026`);
    } else {
      // If not matching pattern, construct default lead description while preserving metadata tags
      const metaTags = updatedDescription.match(/\[[A-Z_]+:\s*[^\]]+\]/g) || [];
      updatedDescription = `${eventName.trim()} is an official competition organized by ${school} during Euphoria 2026 at Kalasalingam Academy of Research and Education. Join the official WhatsApp group for real-time announcements, team coordination, and venue guidelines.` +
        (metaTags.length > 0 ? "\n" + metaTags.join("\n") : "");
    }

    const patchPayload = {
      school_or_dept: school,
      short_description: shortDescription || `${eventName.trim()} organized by ${school} as part of Euphoria 2026 at Kalasalingam Academy of Research and Education.`,
      description: updatedDescription,
    };

    const updateRes = await fetch(`${url}/rest/v1/events?id=eq.${eventRecord.id}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patchPayload),
    });

    if (updateRes.ok) {
      updatedCount++;
      console.log(`[${sNo}/61] ✓ Updated "${eventName}" -> "${school}"`);
    } else {
      const err = await updateRes.text();
      console.error(`[${sNo}/61] ✗ Failed "${eventName}": ${updateRes.status} ${err}`);
      errorCount++;
    }
  }

  console.log(`\n================================`);
  console.log(`Synchronization Summary:`);
  console.log(`- Successfully Updated: ${updatedCount}`);
  console.log(`- Errors/Missing: ${errorCount}`);
  console.log(`================================`);
}

updateDatabase().catch(console.error);
