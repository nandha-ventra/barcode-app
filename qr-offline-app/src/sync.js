import { getPendingTransactions, markAsSynced } from "./db";

const API_BASE_URL = "http://localhost:8001";

export async function syncPendingTransactions() {
  const pendingData = await getPendingTransactions();

  if (pendingData.length === 0) {
    console.log("No pending transactions");
    return;
  }

  for (const item of pendingData) {
    try {
      const response = await fetch(`${API_BASE_URL}/sync-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        await markAsSynced(item.id);
        console.log("Synced:", item.id);
      } else {
        console.log("Sync failed:", item.id);
      }
    } catch (error) {
      console.log("Backend not running or offline:", error);
    }
  }
}