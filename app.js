let batches = [];
let activeQr = "";
let scanStream = null;
let updateStream = null;
let scanTimer = null;
let updateTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function appBaseUrl() {
  const value = $("#appUrlInput").value.trim();
  return value || window.location.origin + window.location.pathname;
}

function qrUrl(batch) {
  const url = new URL(appBaseUrl(), window.location.href);
  url.hash = `scan?qr=${encodeURIComponent(batch.qrValue)}&d=${encodeURIComponent(batch.distributor)}&total=${batch.total}`;
  return url.toString();
}

function renderQrImage(batch) {
  const payload = qrUrl(batch);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=14&data=${encodeURIComponent(payload)}`;
  $("#qrImage").src = src;
  $("#openQrLink").href = payload;
  $("#openQrLink").classList.remove("disabled");
}

function findBatch(qrValue) {
  return batches.find((batch) => batch.qrValue.toLowerCase() === qrValue.trim().toLowerCase());
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Request failed");
  return payload;
}

function upsertLocalBatch(batch) {
  const index = batches.findIndex((item) => item.qrValue === batch.qrValue);
  if (index >= 0) {
    batches[index] = batch;
  } else {
    batches.unshift(batch);
  }
  activeQr = batch.qrValue;
  renderRows();
  return batch;
}

async function refreshBatches() {
  const payload = await apiRequest("/api/batches");
  batches = payload.batches;
  renderRows();
}

async function fetchBatch(qrValue) {
  const payload = await apiRequest(`/api/batches/${encodeURIComponent(qrValue)}`);
  return upsertLocalBatch(payload.batch);
}

function setPage(pageId) {
  $$(".page").forEach((page) => page.classList.toggle("active", page.id === pageId));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.page === pageId));
}

function setMessage(selector, text, type = "") {
  const el = $(selector);
  el.className = `message ${type}`.trim();
  el.textContent = text;
}

function showGenerated(batch) {
  $("#generatedQr").textContent = batch.qrValue;
  $("#generatedInfo").textContent = `${batch.distributor} · ${batch.total} packages · scan opens update page`;
  $("#qrStatus").textContent = "Generated";
  $("#sideQr").textContent = batch.qrValue;
  $("#sideInfo").textContent = `${batch.distributor} · remaining ${batch.remaining}`;
  renderQrImage(batch);
}

function showScanResult(batch) {
  $("#scanResult").innerHTML = `
    <span>Distributor found from QR</span>
    <strong>${batch.distributor}</strong>
    <small>${batch.qrValue}</small>
  `;
  $("#scanTotal").textContent = batch.total;
  $("#scanUsed").textContent = batch.used;
  $("#scanRemaining").textContent = batch.remaining;
  updateAdminControls();
}

function showDistributorResult(batch) {
  $("#distributorTitle").textContent = batch.distributor;
  $("#distributorPill").textContent = batch.remaining === 0 ? "Complete" : "Active";
  $("#distTotal").textContent = batch.total;
  $("#distUsed").textContent = batch.used;
  $("#distRemaining").textContent = batch.remaining;
  $("#sideQr").textContent = batch.qrValue;
  $("#sideInfo").textContent = `${batch.distributor} · remaining ${batch.remaining}`;
}

function resetScanResult() {
  $("#scanResult").innerHTML = `
    <span>Waiting for QR</span>
    <strong>No distributor selected</strong>
    <small>Remaining count appears after scan.</small>
  `;
  $("#scanTotal").textContent = "0";
  $("#scanUsed").textContent = "0";
  $("#scanRemaining").textContent = "0";
  updateAdminControls();
}

function resetDistributorResult() {
  $("#distributorTitle").textContent = "No QR loaded";
  $("#distributorPill").textContent = "Pending";
  $("#distTotal").textContent = "0";
  $("#distUsed").textContent = "0";
  $("#distRemaining").textContent = "0";
}

function renderRows() {
  $("#mappingRows").innerHTML = batches.length
    ? batches
        .map(
          (batch) => `
            <tr>
              <td><strong>${batch.qrValue}</strong></td>
              <td>${batch.distributor}</td>
              <td>${batch.total}</td>
              <td>${batch.used}</td>
              <td><strong>${batch.remaining}</strong></td>
              <td><span class="badge ${batch.remaining === 0 ? "done" : "open"}">${batch.remaining === 0 ? "Complete" : "Active"}</span></td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="6">No QR generated yet.</td></tr>`;
}

function normalizeQrInput(rawValue) {
  const raw = rawValue.trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    const hashMatch = url.hash.match(/[?&]qr=([^&]+)/);
    if (hashMatch) return decodeURIComponent(hashMatch[1]);
    const queryQr = url.searchParams.get("qr");
    if (queryQr) return queryQr;
  } catch {
    return raw;
  }

  return raw;
}

function render() {
  renderRows();
  if (activeQr) {
    const batch = findBatch(activeQr);
    if (batch) {
      showGenerated(batch);
      showScanResult(batch);
      showDistributorResult(batch);
    }
  }
}

function updateAdminControls() {
  const isAdmin = $("#scanRole").value === "ADMIN";
  const hasBatch = Boolean(findBatch(activeQr));
  $("#scanAdminActions").hidden = !(isAdmin && hasBatch);
  $("#scanAdminMessage").textContent = isAdmin
    ? hasBatch
      ? "Admin can decrease quantity for this scanned QR."
      : "Read a QR before decreasing quantity."
    : "Staff can view distributor and remaining quantity only.";
}

$("#generateForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const distributor = $("#generateDistributor").value;
  const total = Number.parseInt($("#generateCount").value, 10);

  if (!Number.isFinite(total) || total <= 0) {
    setMessage("#generateMessage", "Package count must be greater than zero.", "error");
    return;
  }

  try {
    const payload = await apiRequest("/api/batches", {
      method: "POST",
      body: JSON.stringify({ distributor, total }),
    });
    const batch = upsertLocalBatch(payload.batch);
    $("#scanQrInput").value = batch.qrValue;
    $("#distributorQrInput").value = batch.qrValue;
    showGenerated(batch);
    showScanResult(batch);
    showDistributorResult(batch);
    setMessage("#generateMessage", "Server generated QR successfully. Go to Scan QR page.", "success");
    setMessage("#scanMessage", "QR is ready. Scanner client can send this QR to the server.", "success");
    setMessage("#distributorMessage", "QR loaded for distributor count page.", "success");
  } catch (error) {
    setMessage("#generateMessage", error.message, "error");
  }
});

$("#scanForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const qrValue = normalizeQrInput($("#scanQrInput").value);

  try {
    const batch = await fetchBatch(qrValue);
    showScanResult(batch);
    showDistributorResult(batch);
    setMessage("#scanMessage", `Server verified ${batch.distributor}. Remaining count is ${batch.remaining}.`, "success");
  } catch (error) {
    resetScanResult();
    setMessage("#scanMessage", error.message, "error");
  }
});

$("#distributorLoadForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const qrValue = normalizeQrInput($("#distributorQrInput").value);

  try {
    const batch = await fetchBatch(qrValue);
    showDistributorResult(batch);
    showScanResult(batch);
    setMessage("#distributorMessage", `Server loaded ${batch.distributor}. Remaining count is ${batch.remaining}.`, "success");
  } catch (error) {
    resetDistributorResult();
    setMessage("#distributorMessage", error.message, "error");
  }
});

$("#scanRole").addEventListener("change", updateAdminControls);

$("#scanDecreaseButton").addEventListener("click", async () => {
  const batch = findBatch(activeQr || normalizeQrInput($("#scanQrInput").value));
  const amount = Number.parseInt($("#scanDecreaseBy").value, 10);

  if ($("#scanRole").value !== "ADMIN") {
    setMessage("#scanAdminMessage", "Only Admin can decrease quantity.", "error");
    return;
  }

  if (!batch) {
    setMessage("#scanAdminMessage", "Read a valid QR first.", "error");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    setMessage("#scanAdminMessage", "Decrease quantity must be greater than zero.", "error");
    return;
  }

  try {
    const payload = await apiRequest(`/api/batches/${encodeURIComponent(batch.qrValue)}/decrease`, {
      method: "POST",
      body: JSON.stringify({ amount, role: $("#scanRole").value }),
    });
    const updated = upsertLocalBatch(payload.batch);
    showScanResult(updated);
    showDistributorResult(updated);
    setMessage("#scanAdminMessage", payload.message, "success");
  } catch (error) {
    setMessage("#scanAdminMessage", error.message, "error");
  }
});

$("#decreaseButton").addEventListener("click", async () => {
  const batch = findBatch(normalizeQrInput($("#distributorQrInput").value) || activeQr);
  const amount = Number.parseInt($("#decreaseBy").value, 10);

  if (!batch) {
    setMessage("#distributorMessage", "Load a valid QR first.", "error");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    setMessage("#distributorMessage", "Decrease count must be greater than zero.", "error");
    return;
  }

  try {
    const payload = await apiRequest(`/api/batches/${encodeURIComponent(batch.qrValue)}/decrease`, {
      method: "POST",
      body: JSON.stringify({ amount, role: "ADMIN" }),
    });
    const updated = upsertLocalBatch(payload.batch);
    showDistributorResult(updated);
    showScanResult(updated);
    setMessage("#distributorMessage", payload.message, "success");
  } catch (error) {
    setMessage("#distributorMessage", error.message, "error");
  }
});

$("#useQrOnScan").addEventListener("click", () => {
  if (!activeQr) {
    setMessage("#generateMessage", "Generate QR before using it on scan page.", "error");
    return;
  }
  $("#scanQrInput").value = activeQr;
  setPage("scanPage");
});

$("#loadSample").addEventListener("click", async () => {
  const payload = await apiRequest("/api/batches", {
    method: "POST",
    body: JSON.stringify({ distributor: "Distributor A", total: 25 }),
  });
  const batch = upsertLocalBatch(payload.batch);
  $("#scanQrInput").value = batch.qrValue;
  $("#distributorQrInput").value = batch.qrValue;
  $("#generateDistributor").value = "Distributor A";
  $("#generateCount").value = "25";
  setMessage("#generateMessage", "Sample QR generated.", "success");
  setMessage("#scanMessage", "Sample QR is ready to read.", "success");
  setMessage("#distributorMessage", "Sample QR loaded.", "success");
  render();
});

$("#resetDemo").addEventListener("click", async () => {
  stopCamera("scan");
  stopCamera("update");
  batches = [];
  activeQr = "";
  await apiRequest("/api/reset", { method: "POST" });
  $("#generatedQr").textContent = "Not generated";
  $("#generatedInfo").textContent = "Distributor and package count will show here.";
  $("#qrStatus").textContent = "Waiting";
  $("#qrImage").removeAttribute("src");
  $("#openQrLink").href = "#";
  $("#sideQr").textContent = "No QR generated";
  $("#sideInfo").textContent = "Create one from page 1.";
  $("#scanQrInput").value = "";
  $("#distributorQrInput").value = "";
  resetScanResult();
  resetDistributorResult();
  setMessage("#generateMessage", "Choose distributor and package count to generate QR.");
  setMessage("#scanMessage", "Enter generated QR to see remaining count.");
  setMessage("#distributorMessage", "Load a QR before decreasing count.");
  renderRows();
  setPage("generatePage");
});

$$(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setPage(button.dataset.page));
});

$("#copyQrLink").addEventListener("click", async () => {
  const batch = findBatch(activeQr);
  if (!batch) {
    setMessage("#generateMessage", "Generate QR before copying link.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(qrUrl(batch));
    setMessage("#generateMessage", "QR link copied.", "success");
  } catch {
    setMessage("#generateMessage", qrUrl(batch), "success");
  }
});

$("#startCameraScan").addEventListener("click", () => startCamera("scan"));
$("#stopCameraScan").addEventListener("click", () => stopCamera("scan"));
$("#startCameraUpdate").addEventListener("click", () => startCamera("update"));
$("#stopCameraUpdate").addEventListener("click", () => stopCamera("update"));

async function startCamera(mode) {
  const isUpdate = mode === "update";
  const video = isUpdate ? $("#updateVideo") : $("#scanVideo");
  const messageSelector = isUpdate ? "#distributorMessage" : "#scanMessage";

  if (!("BarcodeDetector" in window)) {
    setMessage(messageSelector, "Camera QR scan needs Chrome/Android BarcodeDetector. You can still paste the QR link or value.", "error");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setMessage(messageSelector, "Camera access is unavailable. Use HTTPS or scan with phone camera to open the QR link.", "error");
    return;
  }

  stopCamera(mode);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();

    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const timer = window.setInterval(async () => {
      if (video.readyState < 2) return;
      const codes = await detector.detect(video);
      if (!codes.length) return;
      const qrValue = normalizeQrInput(codes[0].rawValue);
      stopCamera(mode);
      if (isUpdate) {
        $("#distributorQrInput").value = qrValue;
        $("#distributorLoadForm").requestSubmit();
      } else {
        $("#scanQrInput").value = qrValue;
        $("#scanForm").requestSubmit();
      }
    }, 600);

    if (isUpdate) {
      updateStream = stream;
      updateTimer = timer;
    } else {
      scanStream = stream;
      scanTimer = timer;
    }
    setMessage(messageSelector, "Camera started. Point your phone at the generated QR.", "success");
  } catch {
    setMessage(messageSelector, "Camera permission failed. On mobile, open this app with HTTPS or scan the QR using the phone camera.", "error");
  }
}

function stopCamera(mode) {
  const isUpdate = mode === "update";
  const stream = isUpdate ? updateStream : scanStream;
  const timer = isUpdate ? updateTimer : scanTimer;
  const video = isUpdate ? $("#updateVideo") : $("#scanVideo");

  if (timer) window.clearInterval(timer);
  if (stream) stream.getTracks().forEach((track) => track.stop());
  video.srcObject = null;

  if (isUpdate) {
    updateStream = null;
    updateTimer = null;
  } else {
    scanStream = null;
    scanTimer = null;
  }
}

async function loadQrFromHash() {
  const isScanHash = window.location.hash.startsWith("#scan");
  const isUpdateHash = window.location.hash.startsWith("#update");
  if (!isScanHash && !isUpdateHash) return;
  const params = new URLSearchParams(window.location.hash.replace(/^#(?:scan|update)\??/, ""));
  const qrValue = params.get("qr") || "";
  const distributor = params.get("d") || "Distributor from QR";
  const total = Number.parseInt(params.get("total") || "0", 10);
  $("#scanQrInput").value = qrValue;
  $("#distributorQrInput").value = qrValue;
  setPage(isUpdateHash ? "distributorPage" : "scanPage");
  try {
    const batch = await fetchBatch(qrValue);
    showDistributorResult(batch);
    showScanResult(batch);
    setMessage("#scanMessage", `Server verified ${batch.distributor}. Remaining count is ${batch.remaining}.`, "success");
    setMessage("#distributorMessage", `Server loaded ${batch.distributor}. Remaining count is ${batch.remaining}.`, "success");
  } catch (error) {
    setMessage("#scanMessage", `${error.message}. This QR must exist on the server.`, "error");
    setMessage("#distributorMessage", `${error.message}. This QR must exist on the server.`, "error");
  }
}

window.addEventListener("hashchange", loadQrFromHash);

$("#appUrlInput").value = window.location.origin + window.location.pathname;
refreshBatches();
$("#qrImage").removeAttribute("src");
updateAdminControls();
loadQrFromHash();
