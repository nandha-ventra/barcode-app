import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "4173", 10);
const root = normalize(process.cwd());
const dataFile = join(root, "data.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

async function readBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function readStore() {
  try {
    return JSON.parse(await readFile(dataFile, "utf-8"));
  } catch {
    return { batches: [], nextSerial: 1 };
  }
}

async function writeStore(store) {
  await writeFile(dataFile, JSON.stringify(store, null, 2));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function qrCodeFor(distributor, total, serial) {
  const prefix = distributor.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return `BIS-${prefix}-${total}-PKG-${String(serial).padStart(3, "0")}`;
}

function findBatch(store, qrValue) {
  return store.batches.find((batch) => batch.qrValue.toLowerCase() === qrValue.toLowerCase());
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/batches") {
    const store = await readStore();
    sendJson(response, 200, { batches: store.batches });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/batches") {
    const body = await readBody(request);
    const distributor = String(body.distributor || "").trim();
    const total = Number.parseInt(body.total, 10);

    if (!distributor) {
      sendJson(response, 400, { message: "Distributor is required" });
      return true;
    }

    if (!Number.isFinite(total) || total <= 0) {
      sendJson(response, 400, { message: "Package count must be greater than zero" });
      return true;
    }

    const store = await readStore();
    const serial = store.nextSerial || 1;
    const batch = {
      qrValue: qrCodeFor(distributor, total, serial),
      distributor,
      total,
      used: 0,
      remaining: total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.nextSerial = serial + 1;
    store.batches.unshift(batch);
    await writeStore(store);
    sendJson(response, 201, { batch });
    return true;
  }

  const batchMatch = url.pathname.match(/^\/api\/batches\/([^/]+)$/);
  if (request.method === "GET" && batchMatch) {
    const store = await readStore();
    const batch = findBatch(store, decodeURIComponent(batchMatch[1]));
    if (!batch) {
      sendJson(response, 404, { message: "QR not found" });
      return true;
    }
    sendJson(response, 200, { batch });
    return true;
  }

  const decreaseMatch = url.pathname.match(/^\/api\/batches\/([^/]+)\/decrease$/);
  if (request.method === "POST" && decreaseMatch) {
    const body = await readBody(request);
    const role = String(body.role || "STAFF").toUpperCase();
    const amount = Number.parseInt(body.amount, 10);
    const store = await readStore();
    const batch = findBatch(store, decodeURIComponent(decreaseMatch[1]));

    if (role !== "ADMIN") {
      sendJson(response, 403, { message: "Only Admin can decrease quantity" });
      return true;
    }

    if (!batch) {
      sendJson(response, 404, { message: "QR not found" });
      return true;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      sendJson(response, 400, { message: "Decrease quantity must be greater than zero" });
      return true;
    }

    if (batch.remaining <= 0) {
      sendJson(response, 400, { message: "No remaining quantity to decrease" });
      return true;
    }

    const decrease = Math.min(amount, batch.remaining);
    batch.used += decrease;
    batch.remaining -= decrease;
    batch.updatedAt = new Date().toISOString();
    await writeStore(store);
    sendJson(response, 200, {
      batch,
      message: `Admin decreased by ${decrease}. Remaining quantity is ${batch.remaining}.`,
    });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/reset") {
    await writeStore({ batches: [], nextSerial: 1 });
    sendJson(response, 200, { message: "Demo data reset" });
    return true;
  }

  return false;
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    if (await handleApi(request, response, url)) return;
    sendJson(response, 404, { message: "API route not found" });
    return;
  }

  const urlPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(root, urlPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, host, () => {
  console.log(`BiscuitOps UI running at http://${host}:${port}`);
});
