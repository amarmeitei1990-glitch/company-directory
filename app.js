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

// ---------- icons (only the two we use) ----------
const icons = {
  globe: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 100 18 9 9 0 000-18Z" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke="currentColor" stroke-width="2"/></svg>`,
  phone: `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.77 19.77 0 01-8.63-3.07A19.5 19.5 0 013.15 12 19.77 19.77 0 010.08 3.69 2 2 0 012.06 1.5h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.1 9.64a16 16 0 008.26 8.26l1.5-1.23a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg>`
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
  const clocks = document.getElementById("clocksSection");

  if (!company) {
    detailsEl.classList.remove("show");
    detailsEl.innerHTML = "";
    if (disclaimer) disclaimer.classList.add("hidden");
    if (clocks) clocks.classList.remove("hidden"); // show clocks when nothing selected
    return;
  }

  const phoneBlock = company.phone
    ? `${icons.phone}<a class="link" href="tel:${esc(company.phone)}">${esc(company.phone)}</a>`
      + (company.hours ? `<div class="subnote">${esc(company.hours)}</div>` : "")
    : "—";

  const rows = [
    [
      "Website",
      company.website
        ? `<a class="link" href="${esc(company.website)}" target="_blank" rel="noopener">${icons.globe}${esc(company.website)}</a>`
        : "—"
    ],
    ["Phone", phoneBlock]
  ];

  detailsEl.innerHTML = `
    <h2>${esc(company.name)}</h2>
    ${rows.map(([l, v]) =>
      `<div class="row"><div class="label">${esc(l)}</div><div>${v}</div></div>`
    ).join("")}
  `;
  detailsEl.classList.add("show");
  if (disclaimer) disclaimer.classList.remove("hidden");
  if (clocks) clocks.classList.add("hidden"); // hide clocks when details visible
}

// ---------- selection / caret control ----------
function lockSearchUI() { searchEl.readOnly = true; searchEl.classList.add("no-caret"); setTimeout(() => searchEl.blur(), 0); }
function unlockSearchUI() { searchEl.readOnly = false; searchEl.classList.remove("no-caret"); }
function chooseCompany(chosen) { searchEl.value = chosen.name; filtered = []; renderList([]); renderDetails(chosen); lockSearchUI(); }
searchEl.addEventListener("focus", () => { if (searchEl.readOnly) unlockSearchUI(); });

// ---------- filtering ----------
function applyFilter() {
  const q = norm(searchEl.value);
  if (!q) { renderList([]); renderDetails(null); return; }
  filtered = companies.filter(c => norm(c.name).startsWith(q));
  const exact = filtered.find(c => norm(c.name) === q);
  if (exact) { chooseCompany(exact); return; }
  renderList(filtered);
  renderDetails(null);
}

// ---------- init ----------
async function init() {
  try {
    const res = await fetch("companies.json");
    companies = await res.json();
    companies.sort((a, b) => a.name.localeCompare(b.name));

    listEl.classList.add("hidden");
    detailsEl.classList.remove("show");
    const disclaimer = document.getElementById("disclaimer");
    if (disclaimer) disclaimer.classList.add("hidden");

    searchEl.addEventListener("input", applyFilter);

    searchEl.addEventListener("keydown", e => {
      if (e.key !== "Enter" || !filtered.length) return;
      const q = norm(searchEl.value);
      const exact = filtered.find(c => norm(c.name) === q);
      chooseCompany(exact || filtered[0]);
    });

    listEl.addEventListener("click", e => {
      const li = e.target.closest("li[data-i]");
      if (!li) return;
      chooseCompany(filtered[Number(li.dataset.i)]);
    });

    document.addEventListener("contextmenu", e => e.preventDefault());
  } catch (err) {
    console.error("Failed to load companies.json", err);
  }
}
init();

/* ---------- Footer visibility ---------- */
const footer = document.getElementById("footer");
function atBottom() {
  const doc = document.documentElement;
  const scrollBottom = Math.ceil(window.scrollY + window.innerHeight);
  return scrollBottom >= doc.scrollHeight - 1;
}
function updateFooter() { if (footer) footer.classList.toggle("show", atBottom()); }
window.addEventListener("load", updateFooter);
window.addEventListener("scroll", updateFooter, { passive: true });
window.addEventListener("resize", updateFooter);
const mo = new MutationObserver(updateFooter);
mo.observe(document.body, { childList: true, subtree: true });

/* ---------- Analog clocks + subline ---------- */
const analogZones = [
  { id: "clock-ny",  subId: "sub-ny",  tz: "America/New_York" },
  { id: "clock-lon", subId: "sub-lon", tz: "Europe/London" },
  { id: "clock-syd", subId: "sub-syd", tz: "Australia/Sydney" },
  { id: "clock-ist", subId: "sub-ist", tz: "Asia/Kolkata" },
];

// Generate numbers 1–12 around each dial
document.querySelectorAll(".analog-clock .numbers").forEach(container => {
  const size = container.parentElement.offsetWidth;
  const center = size / 2;
  const radius = center - 20;
  for (let i = 1; i <= 12; i++) {
    const span = document.createElement("span");
    span.textContent = i;
    const angle = (i - 3) * (Math.PI * 2 / 12);
    span.style.left = `${center + radius * Math.cos(angle)}px`;
    span.style.top  = `${center + radius * Math.sin(angle)}px`;
    container.appendChild(span);
  }
});

function updateAnalogClocks() {
  const now = new Date();
  analogZones.forEach(z => {
    const el = document.getElementById(z.id);
    if (!el) return;

    const hrEl  = el.querySelector(".hand.hour");
    const minEl = el.querySelector(".hand.minute");
    const secEl = el.querySelector(".hand.second");

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: z.tz, hour: "numeric", minute: "numeric", second: "numeric", hour12: false
    }).formatToParts(now);

    const h = +parts.find(p => p.type === "hour").value;
    const m = +parts.find(p => p.type === "minute").value;
    const s = +parts.find(p => p.type === "second").value;

    hrEl.style.transform  = `translate(-50%, 0) rotate(${(h % 12) * 30 + m * 0.5}deg)`;
    minEl.style.transform = `translate(-50%, 0) rotate(${m * 6 + s * 0.1}deg)`;
    secEl.style.transform = `translate(-50%, 0) rotate(${s * 6}deg)`;

    const subEl = document.getElementById(z.subId);
    if (subEl){
      const day  = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: z.tz }).format(now);
      const time = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: z.tz
      }).format(now);
      subEl.textContent = `${day} ${time}`;
    }
  });
}
updateAnalogClocks();
setInterval(updateAnalogClocks, 1000);
