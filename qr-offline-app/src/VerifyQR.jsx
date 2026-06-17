import { useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { getBatchDetails } from "./api";

export default function VerifyQR() {
  const [scanning, setScanning] = useState(false);
  const [batchDetails, setBatchDetails] = useState(null);
  const [error, setError] = useState("");
  const scannerRef = useRef(null);

  async function handleDecodedText(decodedText) {
    try {
      setError("");

      const qrData = JSON.parse(decodedText);

      if (!qrData.batch_id) {
        throw new Error("Invalid QR: batch_id missing");
      }

      const result = await getBatchDetails(qrData.batch_id);

      setBatchDetails(result.data);
    } catch (error) {
      setError(error.message);
      setBatchDetails(null);
    }
  }

  async function startCameraScan() {
    try {
      setError("");
      setBatchDetails(null);
      setScanning(true);

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: 250,
        },
        async (decodedText) => {
          await stopCameraScan();
          await handleDecodedText(decodedText);
        },
        () => {}
      );
    } catch (error) {
      setError(error.message);
      setScanning(false);
    }
  }

  async function stopCameraScan() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // ignore scanner stop errors
    } finally {
      setScanning(false);
    }
  }

  async function handleUploadQR(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    try {
      setError("");
      setBatchDetails(null);

      const scanner = new Html5Qrcode("qr-upload-reader");

      const decodedText = await scanner.scanFile(file, true);

      await scanner.clear();

      await handleDecodedText(decodedText);
    } catch (error) {
      setError("Unable to read QR image");
    }
  }

  return (
  <div className="p-8">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">Verify QR Status</h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <p className="text-gray-600 text-sm">Scan a distribution QR code to verify its current quantity and see the update history.</p>
          
          <div className="flex flex-col gap-4">
            <button
              className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                scanning ? "bg-red-500 hover:bg-red-600 shadow-red-100" : "bg-purple-600 hover:bg-purple-700 shadow-purple-100"
              }`}
              onClick={scanning ? stopCameraScan : startCameraScan}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {scanning ? "Stop Camera" : "Scan with Camera"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or Upload Image</span>
              </div>
            </div>

            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Click to upload QR</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleUploadQR} />
              </label>
            </div>
          </div>

          <div id="qr-reader" className="w-full overflow-hidden rounded-xl bg-black"></div>
          <div id="qr-upload-reader" style={{ display: "none" }}></div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {batchDetails ? (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center">
                Scan Results
                <span className={`text-xs px-2 py-1 rounded-full ${batchDetails.status === 'UPDATED' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {batchDetails.status}
                </span>
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-500 text-sm">Distributor</span>
                  <span className="font-bold text-gray-800">{batchDetails.distributor_name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-500 text-sm">Initial Quantity</span>
                  <span className="font-bold text-gray-800">{batchDetails.initial_quantity} Units</span>
                </div>
                <div className="flex justify-between items-center py-4">
                  <span className="text-gray-500 text-sm">Current Balance</span>
                  <span className="text-3xl font-black text-purple-600">{batchDetails.current_quantity}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Transaction History</h4>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {batchDetails.transactions.length === 0 ? (
                  <p className="text-gray-400 italic text-sm">No transactions found.</p>
                ) : (
                  batchDetails.transactions.map((item) => (
                    <div key={item.transaction_id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          item.transaction_type === 'GENERATED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.transaction_type}
                        </span>
                        <span className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Update</span>
                        <span className="text-sm font-bold">{item.old_quantity} → {item.new_quantity}</span>
                      </div>
                      {item.remarks && (
                        <p className="text-[11px] text-gray-500 italic mt-2 border-t border-gray-50 pt-2">
                          "{item.remarks}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
            <div className="text-5xl mb-4 grayscale opacity-50">🔍</div>
            <h3 className="text-gray-500 font-bold">No Data Loaded</h3>
            <p className="text-gray-400 text-sm mt-2">Scan or upload a QR code to view<br/>live quantity tracking information</p>
          </div>
        )}
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

const buttonStyle = {
  padding: "10px 20px",
  cursor: "pointer",
};

const resultStyle = {
  marginTop: "20px",
  background: "#f5f5f5",
  padding: "15px",
  borderRadius: "8px",
};

const historyStyle = {
  background: "#fff",
  border: "1px solid #ddd",
  padding: "10px",
  marginBottom: "10px",
};