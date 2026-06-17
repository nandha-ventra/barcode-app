import { useState } from "react";
import GenerateQR from "./GenerateQR";
import ClientUpdate from "./ClientUpdate";
import VerifyQR from "./VerifyQR";

export default function App() {
  const [activeTab, setActiveTab] = useState("generate");

  const tabs = [
    { id: "generate", label: "Generate QR", icon: "➕" },
    { id: "client", label: "Client Update", icon: "🔄" },
    { id: "verify", label: "Verify QR", icon: "✅" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-primary-700 text-white py-8 px-4 shadow-lg mb-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-2">QR Quantity Tracker</h1>
          <p className="text-primary-100 opacity-90">Manage distributor inventory with smart QR codes</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-12">
        <div className="flex flex-wrap justify-center gap-2 mb-8 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary-600 text-white shadow-md transform scale-105"
                  : "text-gray-600 hover:bg-gray-100 hover:text-primary-700"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300">
          <div className="p-1">
             {activeTab === "generate" && <GenerateQR />}
             {activeTab === "client" && <ClientUpdate />}
             {activeTab === "verify" && <VerifyQR />}
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-gray-500 text-sm">
        <p>&copy; 2026 QR Quantity Tracking System. All rights reserved.</p>
      </footer>
    </div>
  );
}
