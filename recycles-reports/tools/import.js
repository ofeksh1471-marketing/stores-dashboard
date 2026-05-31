const jsonInput = document.querySelector("#jsonInput");
const loadCurrent = document.querySelector("#loadCurrent");
const formatJson = document.querySelector("#formatJson");
const mergeCsv = document.querySelector("#mergeCsv");
const storeSelect = document.querySelector("#storeSelect");

loadCurrent.addEventListener("click", loadCurrentData);

formatJson.addEventListener("click", () => {
  const data = readJson();
  jsonInput.value = JSON.stringify(data, null, 2);
});

mergeCsv.addEventListener("click", async () => {
  const data = readJson();
  const context = readContext();

  const campaignRows = await readCsvFile("#campaignsCsv");
  if (campaignRows.length) mergeCampaigns(data, campaignRows, context);

  mergeSummaryText(data, context);
  mergeOrganicForm(data, context);

  mergeOrganic(data, "facebook", await readCsvFile("#facebookCsv"));
  mergeOrganic(data, "instagram", await readCsvFile("#instagramCsv"));
  mergeSummaryCsv(data, await readCsvFile("#summaryCsv"));

  recalculateTotals(data);
  downloadJson(data);
});

loadCurrentData();

async function loadCurrentData() {
  const response = await fetch("/data/report-data.json");
  const data = await response.json();
  jsonInput.value = JSON.stringify(data, null, 2);
  renderStores(data);
}

function renderStores(data) {
  const selected = storeSelect.value;
  storeSelect.innerHTML = data.stores
    .map((store) => `<option value="${store.storeId}">${store.storeName}</option>`)
    .join("");
  if (selected && data.stores.some((store) => store.storeId === selected)) {
    storeSelect.value = selected;
  }
}

function readJson() {
  try {
    const data = JSON.parse(jsonInput.value);
    renderStores(data);
    return data;
  } catch (error) {
    alert("ה־JSON לא תקין. בדקו את קובץ הנתונים הקיים.");
    throw error;
  }
}

function readContext() {
  return {
    storeId: storeSelect.value,
    month: document.querySelector("#monthName").value.trim(),
    monthKey: document.querySelector("#monthKey").value.trim(),
    monthShort: document.querySelector("#monthShort").value.trim()
  };
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
  const number = Number(clean.replace(/,/g, "").replace(/[₪$]/g, ""));
  return Number.isFinite(number) && !/[^\d,.$₪ -]/.test(clean) ? number : clean;
}

function mergeCampaigns(data, rows, context) {
  const groupedRows = rowsByReport(data, rows, context);

  for (const { report, rows: reportRows } of groupedRows) {
    report.campaigns = reportRows
      .map(normalizeCampaignRow)
      .filter((campaign) => campaign.name || campaign.budget || campaign.impressions || campaign.interactions || campaign.clicks || campaign.leads);
  }
}

function rowsByReport(data, rows, context) {
  const grouped = new Map();

  for (const row of rows) {
    const rowContext = {
      storeId: row.storeId || context.storeId,
      month: row.month || context.month,
      monthKey: row.monthKey || context.monthKey,
      monthShort: row.monthShort || context.monthShort
    };
    const report = getReport(data, rowContext);
    const key = `${rowContext.storeId}__${rowContext.monthKey}`;
    if (!grouped.has(key)) grouped.set(key, { report, rows: [] });
    grouped.get(key).rows.push(row);
  }

  return [...grouped.values()];
}

function normalizeCampaignRow(row) {
  return {
    name: pick(row, ["name", "Campaign name", "Campaign Name", "Campaign", "שם קמפיין", "קמפיין"]),
    goal: pick(row, ["goal", "Objective", "Objective name", "Result type", "Results indicator", "מטרה"]),
    budget: pick(row, ["budget", "Amount spent", "Amount spent (ILS)", "Amount spent (₪)", "סכום שהוצא", "תקציב"]),
    impressions: pick(row, ["impressions", "Impressions", "חשיפות"]),
    interactions: pick(row, ["interactions", "Post engagements", "Engagements", "Page engagement", "אינטראקציות", "אינטרקציות"]),
    clicks: pick(row, ["clicks", "Link clicks", "Clicks (all)", "Outbound clicks", "קליקים"]),
    leads: pick(row, ["leads", "Leads", "Messaging conversations started", "New messaging conversations", "On-Facebook leads", "פניות"])
  };
}

function mergeOrganicForm(data, context) {
  const report = getReport(data, context);
  const fields = [...document.querySelectorAll("[data-organic]")];
  const hasAnyValue = fields.some((field) => field.value.trim() !== "");
  if (!hasAnyValue) return;

  report.organic = report.organic || {};
  for (const field of fields) {
    if (field.value.trim() === "") continue;
    const [channel, key] = field.dataset.organic.split(".");
    report.organic[channel] = report.organic[channel] || {};
    report.organic[channel][key] = Number(field.value);
  }
}

function mergeSummaryText(data, context) {
  const text = document.querySelector("#summaryText").value.trim();
  if (!text) return;
  const report = getReport(data, context);
  report.summaryBullets = text
    .split(/\n/)
    .map((item) => item.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

function mergeOrganic(data, channel, rows) {
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

function mergeSummaryCsv(data, rows) {
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

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] !== "" && row[key] !== null && row[key] !== undefined) return row[key];
  }
  return "";
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
