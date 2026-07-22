import React, { useState, useEffect } from 'react';

const EnergyExpensesCalculator = () => {
  const [results, setResults] = useState(null);
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEnergyData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('http://localhost:8080/get_to_convert.php');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        console.log("Data dari DB:", data);
        setDbData(data);
      } catch (e) {
        console.error("Kesalahan fetching data:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEnergyData();
  }, []);

  useEffect(() => {
    if (dbData) {
      calculateExpenses();
    }
  }, [dbData]);

  const calculateExpenses = () => {
    if (!dbData) return;

    const hargaLWBP = 1035.78;
    const hargaWBP = 1553.67;
    const hargaKVARH = 1114.74;
    const ppjRate = 0.03;

    const diffLWBP1 = (dbData.maxStandKWH_8AM || 0) - (dbData.standKWH_prevMonth_8AM || 0);
    const diffLWBP2 = (dbData.maxStandKWH_5PM || 0) - (dbData.standKWH_prevMonth_5PM || 0);
    const diffWBP = (dbData.maxStandKWH_0AM || 0) - (dbData.standKWH_prevMonth_0AM || 0);
    const diffKVARH = (dbData.maxStandKVARH_0AM || 0) - (dbData.standKVARH_prevMonth_0AM || 0);

    const consLWBP1 = diffLWBP1 * 8;
    const consLWBP2 = diffLWBP2 * 8;
    const consWBP = diffWBP * 8;
    const consKVARH = diffKVARH * 8;

    const costLWBP1 = consLWBP1 * hargaLWBP;
    const costLWBP2 = consLWBP2 * hargaLWBP;
    const costWBP = consWBP * hargaWBP;
    const totalEnergy = costLWBP1 + costLWBP2 + costWBP;

    const totalPPJ = (costLWBP1 + costLWBP2 + costWBP) * ppjRate;
    const totalWithPPJ = totalEnergy + totalPPJ;
    const totalKVARH = consKVARH * hargaKVARH;

    const hasil = {
      consLWBP1,
      consLWBP2,
      consWBP,
      costLWBP1,
      costLWBP2,
      costWBP,
      totalEnergy,
      totalPPJ,
      totalWithPPJ,
      consKVARH,
      totalKVARH
    };

    console.log("Hasil perhitungan:", hasil);
    setResults(hasil);
  };

  if (loading) {
    return <div className="p-6 max-w-2xl mx-auto">Memuat data energi dari database...</div>;
  }

  if (error) {
    return <div className="p-6 max-w-2xl mx-auto text-red-500">Error memuat data: {error}. Pastikan API backend berjalan.</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Kalkulator Biaya Energi</h1>

      {dbData && (
        <div className="mb-6 p-4 bg-gray-100 rounded border">
          <h2 className="font-semibold mb-2">Data dari Database:</h2>
          <pre className="text-sm bg-white p-2 rounded overflow-x-auto">
            {JSON.stringify(dbData, null, 2)}
          </pre>
        </div>
      )}

      {results && (
        <div className="mt-4 space-y-2 border p-4 rounded bg-white shadow">
          <h2 className="text-xl font-bold mb-2">Hasil Perhitungan Energi</h2>
          <p>Konsumsi LWBP-1: {results.consLWBP1.toLocaleString()} kWh</p>
          <p>Konsumsi LWBP-2: {results.consLWBP2.toLocaleString()} kWh</p>
          <p>Konsumsi WBP: {results.consWBP.toLocaleString()} kWh</p>
          <p>Konsumsi KVARH: {results.consKVARH.toLocaleString()} kVARh</p>
          <p>Biaya LWBP-1: Rp{results.costLWBP1.toLocaleString()}</p>
          <p>Biaya LWBP-2: Rp{results.costLWBP2.toLocaleString()}</p>
          <p>Biaya WBP: Rp{results.costWBP.toLocaleString()}</p>
          <p>Total Biaya Energi (Sebelum PPJ): Rp{results.totalEnergy.toLocaleString()}</p>
          <p>Total PPJ (3%): Rp{results.totalPPJ.toLocaleString()}</p>
          <p>Total Biaya Energi (Setelah PPJ): Rp{results.totalWithPPJ.toLocaleString()}</p>
          <p>Total Biaya KVARH: Rp{results.totalKVARH.toLocaleString()}</p>
        </div>
      )}

      {!results && (
        <div className="mt-4 text-yellow-600">
          Data berhasil dimuat, tapi perhitungan belum tersedia atau menghasilkan semua nilai 0.
        </div>
      )}
    </div>
  );
};

export default EnergyExpensesCalculator;