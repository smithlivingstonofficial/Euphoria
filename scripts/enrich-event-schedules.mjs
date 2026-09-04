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

// 10 Known Two-Day Events identified in the official schedule
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

async function enrichEvents() {
  console.log("=== ENRICHING EVENTS WITH 2-DAY SCHEDULE METADATA ===");

  const res = await fetch(`${url}/rest/v1/events?select=id,name,slug,description,event_date,start_time,end_time`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const events = await res.json();
  console.log(`Found ${events.length} events in database.`);

  let twoDayUpdated = 0;
  let singleDayUpdated = 0;

  for (const evt of events) {
    const slug = slugify(evt.name);
    const twoDayInfo = TWO_DAY_EVENTS_MAP[slug];

    let desc = evt.description || "";
    // Clean old schedule tags if any
    desc = desc.replace(/\[(IS_TWO_DAY|START_DATE|END_DATE|START_TIME|END_TIME|SCHEDULE_LABEL):[^\]]+\]\n?/g, "").trim();

    let patchPayload = {};

    if (twoDayInfo) {
      desc += `\n[IS_TWO_DAY: true]`;
      desc += `\n[START_DATE: ${twoDayInfo.startDate}]`;
      desc += `\n[END_DATE: ${twoDayInfo.endDate}]`;
      desc += `\n[START_TIME: ${twoDayInfo.startTime}]`;
      desc += `\n[END_TIME: ${twoDayInfo.endTime}]`;
      desc += `\n[SCHEDULE_LABEL: ${twoDayInfo.scheduleLabel}]`;

      patchPayload = {
        description: desc,
        event_date: twoDayInfo.startDate, // Starts on Day 1 (Sept 25)
        start_time: twoDayInfo.startTime,
        end_time: twoDayInfo.endTime,
      };
      twoDayUpdated++;
      console.log(`  ⭐ 2-DAY EVENT: ${evt.name} -> ${twoDayInfo.scheduleLabel}`);
    } else {
      const isDay1 = evt.event_date === "2026-09-25";
      const date = isDay1 ? "2026-09-25" : "2026-09-26";
      const scheduleLabel = isDay1 ? "25 Sep 2026" : "26 Sep 2026";

      desc += `\n[IS_TWO_DAY: false]`;
      desc += `\n[START_DATE: ${date}]`;
      desc += `\n[END_DATE: ${date}]`;
      desc += `\n[SCHEDULE_LABEL: ${scheduleLabel}]`;

      patchPayload = {
        description: desc,
      };
      singleDayUpdated++;
    }

    const patchRes = await fetch(`${url}/rest/v1/events?id=eq.${evt.id}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patchPayload),
    });

    if (!patchRes.ok) {
      console.error(`Failed to update ${evt.name}: ${patchRes.status}`);
    }
  }

  console.log(`\n🎉 ENRICHMENT COMPLETE!`);
  console.log(`Updated ${twoDayUpdated} Two-Day events with 25-26 Sep schedule metadata.`);
  console.log(`Updated ${singleDayUpdated} Single-Day events.`);
}

enrichEvents().catch(console.error);
