const DATA_URL = "/data/report-data.json";

const metricLabels = {
  totalBudget: "תקציב כולל",
  paidImpressions: "חשיפות ממומנות",
  interactions: "אינטראקציות",
  clicks: "קליקים",
  leads: "פניות",
  newFollowers: "עוקבים חדשים",
  organicReach: "חשיפה אורגנית",
  pageVisits: "ביקורים בעמוד",
  profileVisits: "ביקורים בפרופיל",
  messages: "הודעות"
};

const campaignColumns = [
  ["name", "קמפיין"],
  ["goal", "מטרה"],
  ["budget", "תקציב"],
  ["impressions", "חשיפות"],
  ["interactions", "אינטרקציות"],
  ["clicks", "קליקים"],
  ["leads", "פניות"]
];

const app = document.querySelector("#app");

init();

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Data file could not be loaded");
    const data = await response.json();
    const slug = getSlug();

    if (!slug) {
      renderAdmin(data);
      return;
    }

    const store = data.stores.find((item) => item.slug === slug);
    if (!store) {
      renderMissing(data);
      return;
    }

    renderStore(data, store);
  } catch (error) {
    app.innerHTML = `
      <main class="empty-state">
        <h1>לא ניתן לטעון את הדוחות</h1>
        <p>בדקו שקובץ הנתונים נמצא בנתיב <code>${DATA_URL}</code>.</p>
      </main>
    `;
    console.error(error);
  }
}

function getSlug() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== "reports") return "";
  return parts[1] || "";
}

function renderAdmin(data) {
  document.title = "ניהול דוחות | RECYCLES";
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="/reports/">
        <img src="${data.brand.logo}" alt="RECYCLES">
      </a>
      <a class="button secondary" href="/tools/import.html">ייבוא CSV</a>
    </header>
    <main class="admin-layout">
      <section class="admin-hero">
        <p class="eyebrow">דף ניהול פנימי</p>
        <h1>דוחות חודשיים לחנויות RECYCLES</h1>
      </section>
      <section class="store-grid" aria-label="רשימת חנויות">
        ${data.stores.map((store) => `
          <a class="store-card" href="/reports/${store.slug}/">
            <span class="store-logo-frame">
              <img src="${store.storeLogo}" alt="">
            </span>
            <span>
              <strong>${store.storeName}</strong>
              <small>${store.reports.length ? store.reports[0].monthShort : "אין דוחות"}</small>
            </span>
          </a>
        `).join("")}
      </section>
    </main>
  `;
}

function renderMissing(data) {
  app.innerHTML = `
    <main class="empty-state">
      <img class="empty-logo" src="${data.brand.logo}" alt="RECYCLES">
      <h1>לא נמצא דוח בכתובת הזו</h1>
      <a class="button primary" href="/reports/">חזרה לרשימת החנויות</a>
    </main>
  `;
}

function renderStore(data, store) {
  const reports = [...store.reports].sort((a, b) => (b.sortKey || "").localeCompare(a.sortKey || ""));
  const params = new URLSearchParams(window.location.search);
  const requestedMonth = params.get("month");
  const currentReport = reports.find((report) => report.monthKey === requestedMonth) || reports[0];

  document.title = `${store.storeName} | ${currentReport.month}`;
  app.innerHTML = `
    <header class="report-header">
      <div class="header-logos">
        <a class="brand" href="/reports/" aria-label="RECYCLES reports">
          <img src="${data.brand.logo}" alt="RECYCLES">
        </a>
        <span class="divider"></span>
        <span class="store-logo-frame compact">
          <img src="${store.storeLogo}" alt="${store.storeName}">
        </span>
      </div>
      <div class="report-title">
        <p class="eyebrow">פעילות דיגיטלית | ${currentReport.month}</p>
        <h1>${store.storeName}</h1>
      </div>
      <label class="month-picker">
        <span>חודש</span>
        <select id="monthSelect">
          ${reports.map((report) => `
            <option value="${report.monthKey}" ${report.monthKey === currentReport.monthKey ? "selected" : ""}>
              ${report.monthShort || report.month}
            </option>
          `).join("")}
        </select>
      </label>
    </header>

    <main class="report-layout">
      <section class="section summary-section">
        <div class="section-heading">
          <span class="section-number">01</span>
          <h2>מה עשינו החודש?</h2>
        </div>
        ${renderBullets(currentReport.summaryBullets)}
      </section>

      <section class="section">
        <div class="section-heading">
          <span class="section-number">02</span>
          <h2>הקמפיינים שעלו והתוצאות</h2>
        </div>
        ${renderCampaigns(currentReport.campaigns)}
      </section>

      <section class="section">
        <div class="section-heading">
          <span class="section-number">03</span>
          <h2>המספרים של החודש</h2>
        </div>
        <div class="kpi-grid">
          ${Object.entries(currentReport.monthlyTotals || {}).map(([key, value]) => renderKpi(key, value)).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <span class="section-number">04</span>
          <h2>פעילות אורגנית</h2>
        </div>
        ${renderOrganic(currentReport.organic)}
      </section>
    </main>
  `;

  document.querySelector("#monthSelect").addEventListener("change", (event) => {
    const url = new URL(window.location.href);
    url.searchParams.set("month", event.target.value);
    window.location.href = url.toString();
  });
}

function renderBullets(items = []) {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return `<p class="notice">לא הוזן סיכום לחודש זה.</p>`;
  return `<ul class="bullet-list">${visibleItems.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function renderCampaigns(campaigns = []) {
  const visibleCampaigns = campaigns.filter((campaign) => campaign && Object.values(campaign).some((value) => value !== "" && value !== null && value !== undefined));
  if (!visibleCampaigns.length) return `<p class="notice">לא עלו קמפיינים ממומנים החודש.</p>`;

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${campaignColumns.map(([, label]) => `<th>${label}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${visibleCampaigns.map((campaign) => `
            <tr>
              ${campaignColumns.map(([key]) => `<td data-label="${metricLabels[key] || key}">${formatValue(key, campaign[key])}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderKpi(key, value) {
  return `
    <article class="kpi-card">
      <span>${metricLabels[key] || key}</span>
      <strong>${formatValue(key, value)}</strong>
    </article>
  `;
}

function renderOrganic(organic = {}) {
  const hasFacebook = organic.facebook && hasValues(organic.facebook);
  const hasInstagram = organic.instagram && hasValues(organic.instagram);
  if (!hasFacebook && !hasInstagram) return `<p class="notice">לא הוזנו נתונים אורגניים לחודש זה.</p>`;

  return `
    <div class="organic-grid">
      ${hasFacebook ? renderOrganicCard("Facebook", organic.facebook, ["newFollowers", "organicReach", "interactions", "pageVisits", "messages"]) : ""}
      ${hasInstagram ? renderOrganicCard("Instagram", organic.instagram, ["newFollowers", "organicReach", "interactions", "profileVisits", "messages"]) : ""}
    </div>
  `;
}

function renderOrganicCard(title, metrics, keys) {
  return `
    <article class="organic-card">
      <h3>${title}</h3>
      <dl>
        ${keys.map((key) => `
          <div>
            <dt>${metricLabels[key]}</dt>
            <dd>${formatValue(key, metrics[key])}</dd>
          </div>
        `).join("")}
      </dl>
    </article>
  `;
}

function hasValues(object) {
  return Object.values(object).some((value) => value !== "" && value !== null && value !== undefined);
}

function formatValue(key, value) {
  if (value === "" || value === null || value === undefined) return "—";
  if (key === "budget" || key === "totalBudget") return `${numberFormat(value)} ₪`;
  if (typeof value === "number") return numberFormat(value);
  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) && String(value).trim() !== "" ? numberFormat(numeric) : value;
}

function numberFormat(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}
