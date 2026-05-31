const jsonInput = document.querySelector("#jsonInput");
const loadCurrent = document.querySelector("#loadCurrent");
const formatJson = document.querySelector("#formatJson");
const mergeCsv = document.querySelector("#mergeCsv");

loadCurrent.addEventListener("click", async () => {
  const response = await fetch("/data/report-data.json");
  const data = await response.json();
  jsonInput.value = JSON.stringify(data, null, 2);
});

formatJson.addEventListener("click", () => {
  const data = readJson();
  jsonInput.value = JSON.stringify(data, null, 2);
});

mergeCsv.addEventListener("click", async () => {
  const data = readJson();
  await mergeCampaigns(data, await readCsvFile("#campaignsCsv"));
  await mergeOrganic(data, "facebook", await readCsvFile("#facebookCsv"));
  await mergeOrganic(data, "instagram", await readCsvFile("#instagramCsv"));
  await mergeSummary(data, await readCsvFile("#summaryCsv"));
  recalculateTotals(data);
  downloadJson(data);
});

loadCurrent.click();

function readJson() {
  try {
    return JSON.parse(jsonInput.value);
  } catch (error) {
    alert("ה־JSON לא תקין. בדקו את קובץ הנתונים הקיים.");
    throw error;
  }
}

async function readCsvFile(selector) {
  const input = document.querySelector(selector);
  const file = input.files[0];
  if (!file) return [];
  const text = await file.text();
  return parseCsv(text);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return [];

  const headers = rows.shift().map((header) => header.trim());
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, normalizeCell(cells[index])])));
}

function normalizeCell(value = "") {
  const clean = String(value).trim();
  if (clean === "") return "";
  const number = Number(clean.replace(/,/g, ""));
  return Number.isFinite(number) && !/[^\d,.-]/.test(clean) ? number : clean;
}

async function mergeCampaigns(data, rows) {
  for (const row of rows) {
    const report = getReport(data, row);
    report.campaigns = report.campaigns || [];
    report.campaigns.push({
      name: row.name || "",
      goal: row.goal || "",
      budget: row.budget || 0,
      impressions: row.impressions || 0,
      interactions: row.interactions || 0,
      clicks: row.clicks || 0,
      leads: row.leads || 0
    });
  }
}

async function mergeOrganic(data, channel, rows) {
  for (const row of rows) {
    const report = getReport(data, row);
    report.organic = report.organic || {};
    report.organic[channel] = {
      newFollowers: row.newFollowers || 0,
      organicReach: row.organicReach || 0,
      interactions: row.interactions || 0,
      pageVisits: row.pageVisits || "",
      profileVisits: row.profileVisits || "",
      messages: row.messages || 0
    };
  }
}

async function mergeSummary(data, rows) {
  for (const row of rows) {
    const report = getReport(data, row);
    report.summaryBullets = String(row.summaryBullets || "")
      .split(/[;\n|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function getReport(data, row) {
  const store = data.stores.find((item) => item.storeId === String(row.storeId));
  if (!store) throw new Error(`Store not found: ${row.storeId}`);

  const monthKey = row.monthKey || slugMonth(row.month);
  let report = store.reports.find((item) => item.monthKey === monthKey);
  if (!report) {
    report = {
      month: row.month || monthKey,
      monthShort: row.monthShort || shortMonth(row.month || monthKey),
      monthKey,
      sortKey: monthKey,
      summaryBullets: [],
      campaigns: [],
      monthlyTotals: {},
      organic: {}
    };
    store.reports.unshift(report);
  }

  return report;
}

function recalculateTotals(data) {
  for (const store of data.stores) {
    for (const report of store.reports) {
      const campaigns = report.campaigns || [];
      const facebook = report.organic?.facebook || {};
      const instagram = report.organic?.instagram || {};
      report.monthlyTotals = {
        totalBudget: sum(campaigns, "budget"),
        paidImpressions: sum(campaigns, "impressions"),
        interactions: sum(campaigns, "interactions"),
        clicks: sum(campaigns, "clicks"),
        leads: sum(campaigns, "leads"),
        newFollowers: Number(facebook.newFollowers || 0) + Number(instagram.newFollowers || 0)
      };
      store.reports.sort((a, b) => String(b.sortKey || "").localeCompare(String(a.sortKey || "")));
    }
  }
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function slugMonth(value = "") {
  return String(value).trim();
}

function shortMonth(value = "") {
  return String(value).replace("2026", "26").replace("2027", "27");
}

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "report-data.json";
  link.click();
  URL.revokeObjectURL(url);
}
