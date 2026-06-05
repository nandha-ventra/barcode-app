const crates = [
  {
    id: "BCT-CHN-0482",
    batch: "Milk Shortbread · MFB-26",
    location: "Loading bay B",
    status: "risk",
    note: "Temp spike detected for 11 minutes",
  },
  {
    id: "BCT-CHN-0519",
    batch: "Glucose Plus · GLP-11",
    location: "TN-04 Bakery Loop",
    status: "risk",
    note: "Route delay over threshold",
  },
  {
    id: "BCT-CHN-0441",
    batch: "Cream Sandwich · CRS-08",
    location: "OMR Retail Run",
    status: "clean",
    note: "Verified at 14:08",
  },
  {
    id: "BCT-CHN-0394",
    batch: "Marie Gold · MRG-31",
    location: "Porur Return Flow",
    status: "lost",
    note: "Missing return scan",
  },
  {
    id: "BCT-CHN-0602",
    batch: "Digestive Lite · DGL-19",
    location: "Warehouse aisle 6",
    status: "clean",
    note: "Ready for dispatch",
  },
];

const agentMessages = [
  {
    title: "Agent summary",
    text: "Route TN-04 has the highest exception density. Prioritize BCT-CHN-0519 and reassign 28 crates to Van V2.",
  },
  {
    title: "Recommended action",
    text: "Ask bay staff to rescan BCT-CHN-0394 before close. It has no return event after retailer handoff.",
  },
];

const crateRows = document.querySelector("#crateRows");
const filterButtons = document.querySelectorAll("[data-filter]");
const navItems = document.querySelectorAll("[data-view]");
const panels = document.querySelectorAll("[data-panel]");
const agentFeed = document.querySelector("#agentFeed");
const agentForm = document.querySelector("#agentForm");
const agentInput = document.querySelector("#agentInput");
const lastScan = document.querySelector("#lastScan");
const simulateScan = document.querySelector("#simulateScan");
const scanNow = document.querySelector("#scanNow");
const resolveAlert = document.querySelector("#resolveAlert");

function renderCrates(filter = "all") {
  const visible = crates.filter((crate) => {
    if (filter === "all") return true;
    if (filter === "clean") return crate.status === "clean";
    return crate.status !== "clean";
  });

  crateRows.innerHTML = visible
    .map(
      (crate) => `
        <tr>
          <td><strong>${crate.id}</strong></td>
          <td>${crate.batch}</td>
          <td>${crate.location}</td>
          <td><span class="badge ${crate.status}">${statusLabel(crate.status)}</span></td>
          <td>${crate.note}</td>
        </tr>
      `,
    )
    .join("");
}

function statusLabel(status) {
  return {
    clean: "Clean",
    risk: "At risk",
    lost: "Missing",
  }[status];
}

function renderMessages() {
  agentFeed.innerHTML = agentMessages
    .map(
      (message) => `
        <div class="message">
          <strong>${message.title}</strong>
          ${message.text}
        </div>
      `,
    )
    .join("");
  agentFeed.scrollTop = agentFeed.scrollHeight;
}

function addAgentMessage(title, text) {
  agentMessages.push({ title, text });
  renderMessages();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderCrates(button.dataset.filter);
  });
});

navItems.forEach((button) => {
  button.addEventListener("click", () => {
    navItems.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const panel = document.querySelector(`[data-panel="${button.dataset.view}"]`);
    panel?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

agentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const command = agentInput.value.trim();
  if (!command) return;
  addAgentMessage("Command received", command);
  addAgentMessage(
    "Agent result",
    "3 delayed crates found. Suggested fix: move BCT-CHN-0519 to Van V2 and notify the TN-04 driver.",
  );
});

simulateScan.addEventListener("click", () => {
  const crate = crates[Math.floor(Math.random() * crates.length)];
  lastScan.textContent = crate.id;
  addAgentMessage("Scan verified", `${crate.id} matched ${crate.batch} at ${crate.location}.`);
});

scanNow.addEventListener("click", () => {
  document.querySelector('[data-panel="scanner"]').scrollIntoView({ behavior: "smooth", block: "center" });
});

resolveAlert.addEventListener("click", () => {
  document.querySelector('[data-panel="agent"]').scrollIntoView({ behavior: "smooth", block: "center" });
  addAgentMessage("Alert review", "Exception queue opened. The fastest resolution path is rescan, route split, then supervisor approval.");
});

renderCrates();
renderMessages();
