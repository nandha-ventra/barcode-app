import { useState } from "react";
import QRCode from "qrcode";

export default function QRGenerator() {
  const [batchId, setBatchId] = useState("");
  const [distributorId, setDistributorId] = useState("");
  const [distributorName, setDistributorName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [qrText, setQrText] = useState("");

  const generateQR = async () => {
    if (!batchId || !distributorId || !distributorName || !quantity) {
      alert("Please fill all fields");
      return;
    }

    const qrData = {
      batch_id: batchId,
      distributor_id: distributorId,
      distributor_name: distributorName,
      initial_quantity: Number(quantity),
      created_at: new Date().toISOString(),
    };

    const text = JSON.stringify(qrData);

    const imageUrl = await QRCode.toDataURL(text);

    setQrText(text);
    setQrImage(imageUrl);
  };

  return (
    <div style={boxStyle}>
      <h2>Generate QR Code</h2>

      <input
        style={inputStyle}
        type="text"
        placeholder="Batch ID"
        value={batchId}
        onChange={(e) => setBatchId(e.target.value)}
      />

      <input
        style={inputStyle}
        type="text"
        placeholder="Distributor ID"
        value={distributorId}
        onChange={(e) => setDistributorId(e.target.value)}
      />

      <input
        style={inputStyle}
        type="text"
        placeholder="Distributor Name"
        value={distributorName}
        onChange={(e) => setDistributorName(e.target.value)}
      />

      <input
        style={inputStyle}
        type="number"
        placeholder="Quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />

      <button style={buttonStyle} onClick={generateQR}>
        Generate QR
      </button>

      {qrImage && (
        <div style={{ marginTop: "20px" }}>
          <h3>Generated QR</h3>

          <img src={qrImage} alt="QR Code" />

          <p>
            <b>QR Text:</b>
          </p>

          <pre style={preStyle}>{qrText}</pre>

          <a href={qrImage} download={`${batchId}.png`}>
            Download QR
          </a>
        </div>
      )}
    </div>
  );
}

const boxStyle = {
  border: "1px solid #ccc",
  padding: "20px",
  marginBottom: "20px",
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

const preStyle = {
  background: "#f5f5f5",
  padding: "10px",
  width: "fit-content",
};