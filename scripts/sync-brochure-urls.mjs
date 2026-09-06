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

async function syncBrochures() {
  console.log("Fetching all events from Supabase...");
  const res = await fetch(url + "/rest/v1/events?select=id,name,slug,brochure_url,description", {
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
    },
  });
  const events = await res.json();
  console.log(`Found ${events.length} events.`);

  let updatedCount = 0;

  for (const evt of events) {
    const desc = evt.description || "";
    const brochureMatch = desc.match(/\[(BROCHURE_URL|BROCHURE_LINK):\s*([^\]]+)\]/);
    const descUrl = brochureMatch ? brochureMatch[2].trim() : null;
    const colUrl = evt.brochure_url ? evt.brochure_url.trim() : null;

    // Determine the authoritative URL:
    // If the coordinator updated description with a new tag, that represents the most recent coordinator edit.
    // If only column exists, use column.
    const authoritativeUrl = descUrl || colUrl;

    if (!authoritativeUrl) continue;

    let needsColUpdate = colUrl !== authoritativeUrl;
    let needsDescUpdate = descUrl !== authoritativeUrl;

    if (needsColUpdate || needsDescUpdate) {
      let cleanDesc = desc.replace(/\[(BROCHURE_URL|BROCHURE_LINK):\s*[^\]]+\]/g, "").trim();
      if (authoritativeUrl) {
        cleanDesc += `\n[BROCHURE_URL: ${authoritativeUrl}]`;
      }

      console.log(`Syncing event "${evt.name}" (${evt.id}):`);
      console.log(`  Col was: "${colUrl}"`);
      console.log(`  Desc was: "${descUrl}"`);
      console.log(`  Now set to: "${authoritativeUrl}"`);

      const updateRes = await fetch(`${url}/rest/v1/events?id=eq.${evt.id}`, {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: "Bearer " + serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          brochure_url: authoritativeUrl,
          description: cleanDesc,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error(`Failed to update ${evt.name}:`, errText);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\nSynchronization complete! ${updatedCount} event(s) updated.`);
}

syncBrochures().catch(console.error);
