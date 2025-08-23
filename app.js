// ---------- helpers ----------
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  );
const norm = (s = "") => s.toLowerCase().trim();

const $ = q => document.querySelector(q);
const listEl = $("#companyList");
const detailsEl = $("#details");
const searchEl = $("#search");

let companies = [];
let filtered = [];

// ---------- icons ----------
const icons = {
  globe: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 100 18 9 9 0 000-18Z" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke="currentColor" stroke-width="2"/></svg>`,
  phone: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.77 19.77 0 01-8.63-3.07A19.5 19.5 0 013.15 12 19.77 19.77 0 010.08 3.69 2 2 0 012.06 1.5h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.1 9.64a16 16 0 008.26 8.26l1.5-1.23a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg>`,
  life: `<svg class="icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24" stroke="currentColor" stroke-width="2"/></svg>`,
  twitter: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0012 7.09v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" stroke="currentColor" stroke-width="2"/></svg>`,
  facebook: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="currentColor" stroke-width="2"/></svg>`
};

// ---------- rendering ----------
function renderList(items) {
  if (!items.length) {
    listEl.innerHTML = "";
    listEl.classList.add("hidden");
    return;
  }
  listEl.innerHTML = items
    .map((c, i) => `<li role="button" data-i="${i}"><span>${esc(c.name)}</span></li>`)
    .join("");
  listEl.classList.remove("hidden");
}

function renderDetails(company) {
  const disclaimer = document.getElementById("disclaimer");

  if (!company) {
    detailsEl.classList.remove("show");
    detailsEl.innerHTML = "";
    if (disclaimer) disclaimer.classList.add("hidden"); // hide disclaimer
    return;
  }

  const rows = [
    ["Website", company.website ? `<a class="link" href="${esc(company.website)}" target="_blank" rel="noopener">${icons.globe}${esc(company.website)}</a>` : "—"],
    ["Phone", company.phone ? `${icons.phone}<a class="link" href="tel:${esc(company.phone)}">${esc(company.phone)}</a>` : "—"],
    ["Help Page", company.helpPage ? `<a class="link" href="${esc(company.helpPage)}" target="_blank" rel="noopener">${icons.life}${esc(company.helpPage)}</a>` : "—"],
    ["Twitter", company.social?.twitter ? `<a class="link" href="${esc(company.social.twitter)}" target="_blank" rel="noopener">${icons.twitter}${esc(company.social.twitter)}</a>` : "—"],
    ["Facebook", company.social?.facebook ? `<a class="link" href="${esc(company.social.facebook)}" target="_blank" rel="noopener">${icons.facebook}${esc(company.social.facebook)}</a>` : "—"]
  ];

  detailsEl.innerHTML = `
    <h2>${esc(company.name)}</h2>
    ${rows.map(([l, v]) =>
      `<div class="row"><div class="label">${esc(l)}</div><div>${v}</div></div>`
    ).join("")}
  `;
  detailsEl.classList.add("show");
  if (disclaimer) disclaimer.classList.remove("hidden"); // show disclaimer
}

// ---------- selection / caret control ----------
function lockSearchUI() {
  searchEl.readOnly = true;             // block typing
  searchEl.classList.add("no-caret");   // CSS hides caret
  setTimeout(() => searchEl.blur(), 0); // ensure no caret remains
}
function unlockSearchUI() {
  searchEl.readOnly = false;
  searchEl.classList.remove("no-caret");
}

function chooseCompany(chosen) {
  searchEl.value = chosen.name; // auto-complete
  filtered = [];
  renderList([]);
  renderDetails(chosen);
  lockSearchUI();
}

// Re-enable typing when user clicks the search box again
searchEl.addEventListener("focus", () => {
  if (searchEl.readOnly) {
    unlockSearchUI();
    // Optional: clear for a fresh search
    // searchEl.value = "";
    // renderDetails(null);
  }
});

// ---------- filtering ----------
function applyFilter() {
  const q = norm(searchEl.value);

  if (!q) {
    renderList([]);
    renderDetails(null); // also hides disclaimer
    return;
  }

  // Only names that START WITH the query
  filtered = companies.filter(c => norm(c.name).startsWith(q));

  // If exact match -> select it (auto-fill + hide list + details + disclaimer)
  const exact = filtered.find(c => norm(c.name) === q);
  if (exact) {
    chooseCompany(exact);
    return;
  }

  // Show suggestions only
  renderList(filtered);
  renderDetails(null); // keep details (and disclaimer) hidden until chosen
}

// ---------- init & events ----------
async function init() {
  try {
    const res = await fetch("companies.json");
    companies = await res.json();
    companies.sort((a, b) => a.name.localeCompare(b.name));

    // start hidden
    listEl.classList.add("hidden");
    detailsEl.classList.remove("show");
    const disclaimer = document.getElementById("disclaimer");
    if (disclaimer) disclaimer.classList.add("hidden");

    // typing
    searchEl.addEventListener("input", applyFilter);

    // Enter chooses current suggestion (exact match preferred)
    searchEl.addEventListener("keydown", e => {
      if (e.key !== "Enter" || !filtered.length) return;
      const q = norm(searchEl.value);
      const exact = filtered.find(c => norm(c.name) === q);
      const chosen = exact || filtered[0];
      chooseCompany(chosen);
    });

    // Click a suggestion to choose
    listEl.addEventListener("click", e => {
      const li = e.target.closest("li[data-i]");
      if (!li) return;
      const chosen = filtered[Number(li.dataset.i)];
      chooseCompany(chosen);
    });

    // Disable right-click everywhere
    document.addEventListener("contextmenu", e => e.preventDefault());
  } catch (err) {
    console.error("Failed to load companies.json", err);
  }
}

init();
