import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { saveTransaction, getAllTransactions } from "./db";

export default function QRScanner() {
  const [qrData, setQrData] = useState(null);
  const [transactionType, setTransactionType] = useState("DISTRIBUTOR_RECEIVED");
  const [quantity, setQuantity] = useState("");
  const [damagedQuantity, setDamagedQuantity] = useState("0");
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    if (qrData) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: 250,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        try {
          const data = JSON.parse(decodedText);

          if (!data.batch_id) {
            alert("Invalid QR: batch_id missing");
            return;
          }

          setQrData(data);
          scanner.clear();
        } catch (error) {
          alert("Invalid QR code data");
        }
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [qrData]);

  const loadTransactions = async () => {
    const data = await getAllTransactions();
    setTransactions(data);
  };

  const saveOffline = async () => {
    if (!qrData || !quantity) {
      alert("Please scan QR and enter quantity");
      return;
    }

    const transaction = {
      id: crypto.randomUUID(),

      batch_id: qrData.batch_id,
      distributor_id: qrData.distributor_id,
      distributor_name: qrData.distributor_name,
      initial_quantity: qrData.initial_quantity,

      transaction_type: transactionType,
      quantity: Number(quantity),
      damaged_quantity: Number(damagedQuantity || 0),

      sync_status: "PENDING",
      scanned_at: new Date().toISOString(),
    };

    await saveTransaction(transaction);

    alert("Saved offline successfully");

    setQrData(null);
    setQuantity("");
    setDamagedQuantity("0");

    await loadTransactions();
  };

  return (
    <div style={boxStyle}>
      <h2>Scan QR Code</h2>

      {!qrData && <div id="qr-reader" style={{ width: "320px" }}></div>}

      {qrData && (
        <div>
          <h3>Scanned Details</h3>

          <p>
            <b>Batch ID:</b> {qrData.batch_id}
          </p>

          <p>
            <b>Distributor ID:</b> {qrData.distributor_id}
          </p>

          <p>
            <b>Distributor Name:</b> {qrData.distributor_name}
          </p>

          <p>
            <b>Initial Quantity:</b> {qrData.initial_quantity}
          </p>

          <label>Transaction Type</label>
          <br />

          <select
            style={inputStyle}
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
          >
            <option value="OUTBOUND">Outbound</option>
            <option value="DISTRIBUTOR_RECEIVED">
              Distributor Received
            </option>
            <option value="RETURNED">Returned</option>
          </select>

          <label>Quantity</label>
          <br />

          <input
            style={inputStyle}
            type="number"
            placeholder="Enter quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <label>Damaged Quantity</label>
          <br />

          <input
            style={inputStyle}
            type="number"
            value={damagedQuantity}
            onChange={(e) => setDamagedQuantity(e.target.value)}
          />

          <button style={buttonStyle} onClick={saveOffline}>
            Save Offline
          </button>

          <button
            style={{ ...buttonStyle, marginLeft: "10px" }}
            onClick={() => setQrData(null)}
          >
            Scan Again
          </button>
        </div>
      )}

      <hr />

      <h3>Offline Transactions</h3>

      {transactions.length === 0 && <p>No offline records</p>}

      {transactions.map((item) => (
        <div key={item.id} style={cardStyle}>
          <p>
            <b>Batch:</b> {item.batch_id}
          </p>

          <p>
            <b>Distributor:</b> {item.distributor_name}
          </p>

          <p>
            <b>Type:</b> {item.transaction_type}
          </p>

          <p>
            <b>Quantity:</b> {item.quantity}
          </p>

          <p>
            <b>Damaged:</b> {item.damaged_quantity}
          </p>

          <p>
            <b>Sync:</b> {item.sync_status}
          </p>
        </div>
      ))}
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
  width: "300px",
  padding: "10px",
  marginBottom: "10px",
};

const buttonStyle = {
  padding: "10px 20px",
  cursor: "pointer",
};

const cardStyle = {
  border: "1px solid #ddd",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "6px",
};