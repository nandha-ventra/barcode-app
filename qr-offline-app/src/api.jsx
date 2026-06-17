const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function getDistributors() {
  const response = await fetch(`${API_BASE_URL}/distributors`);

  if (!response.ok) {
    throw new Error("Failed to fetch distributors");
  }

  return response.json();
}

export async function createQRBatch(payload) {
  const response = await fetch(`${API_BASE_URL}/qr-batches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create QR batch");
  }

  return response.json();
}

export async function getBatches(distributorId) {
  const url = distributorId
    ? `${API_BASE_URL}/qr-batches?distributor_id=${distributorId}`
    : `${API_BASE_URL}/qr-batches`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch batches");
  }

  return response.json();
}

export async function getBatchDetails(batchId) {
  const response = await fetch(`${API_BASE_URL}/qr-batches/${batchId}`);

  if (!response.ok) {
    throw new Error("Batch not found");
  }

  return response.json();
}

export async function updateBatchQuantity(batchId, payload) {
  const response = await fetch(`${API_BASE_URL}/qr-batches/${batchId}/quantity`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update quantity");
  }

  return response.json();
}