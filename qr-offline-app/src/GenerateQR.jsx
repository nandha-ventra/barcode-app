import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { createQRBatch, getDistributors } from "./api";

export default function GenerateQR() {
  const [distributors, setDistributors] = useState([]);
  const [distributorId, setDistributorId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDistributors();
  }, []);

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

  async function handleGenerateQR() {
    if (!distributorId || !quantity) {
      alert("Please choose distributor and quantity");
      return;
    }

    try {
      setLoading(true);

      const result = await createQRBatch({
        distributor_id: distributorId,
        quantity: Number(quantity),
      });

      const qrText = JSON.stringify(result.data.qr_payload);

      const imageUrl = await QRCode.toDataURL(qrText);

      setQrImage(imageUrl);
      setBatchData(result.data);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }
return (
  <div className="p-8">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-primary-100 text-primary-700 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">Generate QR Batch</h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Distributor</label>
          <select
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
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
          <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Quantity</label>
          <input
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
            type="number"
            placeholder="e.g. 100"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <button 
          className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-primary-600 hover:bg-primary-700"
          }`} 
          onClick={handleGenerateQR} 
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : "Generate QR Code"}
        </button>

        {batchData && (
          <div className="bg-green-50 border border-green-100 p-6 rounded-2xl animate-fade-in">
            <h3 className="text-green-800 font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">✅</span> Batch Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-green-100 pb-2">
                <span className="text-green-600 font-medium">Batch ID</span>
                <span className="text-green-900 font-bold font-mono">{batchData.batch_id}</span>
              </div>
              <div className="flex justify-between border-b border-green-100 pb-2">
                <span className="text-green-600 font-medium">Distributor</span>
                <span className="text-green-900 font-bold">{batchData.distributor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600 font-medium">Quantity</span>
                <span className="text-green-900 font-bold">{batchData.initial_quantity} Units</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 min-h-[300px]">
        {qrImage ? (
          <div className="text-center animate-scale-in">
            <h3 className="text-gray-700 font-bold mb-4">Preview</h3>
            <div className="bg-white p-4 rounded-2xl shadow-md inline-block mb-6">
              <img src={qrImage} alt="QR Code" className="w-48 h-48" />
            </div>
            <a 
              className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-white border-2 border-primary-600 text-primary-600 rounded-xl font-bold hover:bg-primary-50 transition-colors" 
              href={qrImage} 
              download={`${batchData.batch_id}.png`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Image
            </a>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🖼️</div>
            <p>Fill in the details to generate<br/>your distribution QR code</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

}