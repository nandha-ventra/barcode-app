import { useEffect, useState } from "react";
import {
  getDistributors,
  getBatches,
  updateBatchQuantity,
} from "./api";

export default function ClientUpdate() {
  const [distributors, setDistributors] = useState([]);
  const [distributorId, setDistributorId] = useState("");
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(null);

  useEffect(() => {
    loadDistributors();
  }, []);

  useEffect(() => {
    if (distributorId) {
      loadBatches(distributorId);
    }
  }, [distributorId]);

  useEffect(() => {
    const batch = batches.find((item) => item.batch_id === batchId);
    setSelectedBatch(batch || null);
  }, [batchId, batches]);

  async function loadDistributors() {
    try {
      const result = await getDistributors();
      setDistributors(result.data);

      if (result.data.length > 0) {
        setDistributorId(result.data[0].distributor_id);
      }
    } catch (error) {
      alert(error.message);
    }
  }

  async function loadBatches(id) {
    try {
      const result = await getBatches(id);
      setBatches(result.data);

      if (result.data.length > 0) {
        setBatchId(result.data[0].batch_id);
      } else {
        setBatchId("");
      }
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleUpdateQuantity() {
    if (!batchId || newQuantity === "") {
      alert("Please choose batch and enter quantity");
      return;
    }

    try {
      const result = await updateBatchQuantity(batchId, {
        new_quantity: Number(newQuantity),
        remarks,
      });

      alert(result.message);

      setNewQuantity("");
      setRemarks("");

      await loadBatches(distributorId);
    } catch (error) {
      alert(error.message);
    }
  }


  return (
  <div className="p-8">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">Update Client Stock</h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Distributor</label>
            <select
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              value={distributorId}
              onChange={(e) => setDistributorId(e.target.value)}
            >
              {distributors.map((item) => (
                <option key={item.distributor_id} value={item.distributor_id}>
                  {item.distributor_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Active Batch</label>
            <select
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              <option value="">-- Choose a batch --</option>
              {batches.map((item) => (
                <option key={item.batch_id} value={item.batch_id}>
                  {item.batch_id} (Stock: {item.current_quantity})
                </option>
              ))}
            </select>
            {batches.length === 0 && (
              <p className="mt-2 text-xs text-red-500 font-medium italic">No active batches for this distributor.</p>
            )}
          </div>
        </div>

        {selectedBatch && (
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 animate-fade-in">
            <h3 className="text-gray-800 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
              📊 Batch Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-gray-100">
                <span className="block text-xs text-gray-500 mb-1">Initial Stock</span>
                <span className="text-lg font-bold text-gray-800">{selectedBatch.initial_quantity}</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-100">
                <span className="block text-xs text-gray-500 mb-1">Current Balance</span>
                <span className="text-lg font-bold text-blue-600">{selectedBatch.current_quantity}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">New Remaining Quantity</label>
          <input
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            type="number"
            placeholder="What's left now?"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks (Optional)</label>
          <textarea
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
            rows="3"
            placeholder="e.g. Delivered to site B"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <button 
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all transform active:scale-95 disabled:bg-gray-300 disabled:shadow-none" 
          onClick={handleUpdateQuantity}
          disabled={!batchId}
        >
          Update Stock Balance
        </button>
      </div>
    </div>
  </div>
);
}

const boxStyle = {
  border: "1px solid #ccc",
  padding: "20px",
  borderRadius: "8px",
};

const inputStyle = {
  display: "block",
  width: "360px",
  padding: "10px",
  marginBottom: "15px",
};

const buttonStyle = {
  padding: "10px 20px",
  cursor: "pointer",
};

const summaryStyle = {
  background: "#f5f5f5",
  padding: "10px",
  marginBottom: "15px",
  width: "360px",
};