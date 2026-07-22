// Fungsi untuk menghapus waktu dari Date
const stripTime = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const ReadDailyMV = (workbook, dataList) => {
  const worksheetMV = workbook.addWorksheet("Read Daily MV", {
  properties: { tabColor: { argb: 'FFFF0000' } }
  })
  worksheetMV.views = [
  { state: 'frozen',
    xSplit: 1,
    showGridLines: false }
  ];

    // Title
    worksheetMV.mergeCells("A1:D1");
    const titleCell = worksheetMV.getCell("A1");
    titleCell.value = "Daily Energy Consumption STAND kWh Meter";
    titleCell.font = { bold: true, size: 20 };
    titleCell.alignment = { horizontal: "center", vertical: "left" };
    titleCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Date Label
    const dateLabel = worksheetMV.getCell("A2");
    dateLabel.value = "DATE";
    dateLabel.font = { bold: true, size: 14 };
    dateLabel.alignment = { horizontal: "center", vertical: "middle" };
    dateLabel.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ff00cc66' }, // Hijau
    };
    dateLabel.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Header
    const headerRow = worksheetMV.getRow(3);
    // Kolom A (DESCRIPTION)
    const descCell = headerRow.getCell(1);
    descCell.value = "DESCRIPTION";
    descCell.font = { bold: true, size: 14 };
    descCell.alignment = { horizontal: "center", vertical: "middle" };
    descCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ff00cc66' },
    };
    descCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    
    const nameRow = worksheetMV.getRow(4);
    const checkCell = nameRow.getCell(1);
    checkCell.value = "Check by";
    checkCell.font = { bold: true, size: 14 };
    checkCell.alignment = { horizontal: "center", vertical: "middle" };
    checkCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ffffff00' },
    };
    checkCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Data Rows
    const rows = [
      [{ value: "20kV GARDU PLN", bold: true, size: 12 }],
      [{ value: "Stand kWh LWBP-1", bold: true, size: 14, color: "ff002060", fgColor: {argb: "ff99ffcc"} }],
      [{ value: "Stand kWh LWBP-2", bold: true, size: 14, color: "ff002060", fgColor: {argb: "ff99ffcc"} }],
      [{ value: "Stand kWh WBP", bold: true, size: 14, color: "ffe26b0a", fgColor: {argb: "ff99ffcc"} }],
      [{ value: "Total Stand kWh", bold: true, size: 14, color: "ff0000ff", fgColor: {argb: "ff99ffcc"} }],
      [{ value: "Stand kVARh PLN", bold: true, size: 14, color: "ff800000", fgColor: {argb: "ff99ffcc"} }],
      [{ value: " ", fgColor: {argb: "ff99ffcc"}}],
      [{ value: "20kV MV-I Nat Grid Incomer", bold: true, size: 12 }],
      [{ value: "Stand kWh", bold: true, size: 14, color: "ffff0000", fgColor: {argb: "ff99ffcc"} }],
      [{ value: "Stand kVARh", bold: true, size: 14, color: "ffff0000", fgColor: {argb: "ff99ffcc"} }],
      [{ value: "20kV MV Nat Grid OutGoing", bold: true, size: 12 }],
      [{ value: "Stand kWh", bold: true, size: 14, color: "ffff0000", fgColor: {argb: "ff99ffcc"} }],
      [{ value: "Stand kVARh", bold: true, size: 14, color: "ffff0000", fgColor: {argb: "ff99ffcc"} }],
      [{ value: "Reading @Out Going Trafo", bold: true, size: 12 }],
      [{ value: "MV-A TRAFO 1", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-A TRAFO 2", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-A TRAFO 3", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-A TRAFO 4", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-B TRAFO 1", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-B TRAFO 2", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-B TRAFO 3", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-B TRAFO 4", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-C TRAFO 1", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-C TRAFO 2", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12, fgColor: {argb: "ffffff00"} }],
      [{ value: "Stand kVARh", bold: true, size: 12, fgColor: {argb: "ffffff00"} }],
      [{ value: "MV-U TRAFO 1", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
      [{ value: "MV-U TRAFO 2", bold: true, size: 12, fgColor: {argb: "ff92d050"} }],
      [{ value: "Stand kWh", bold: true, size: 12 }],
      [{ value: "Stand kVARh", bold: true, size: 12 }],
    ];

    let currentRow = 5;
    for (const row of rows) {
      const excelRow = worksheetMV.getRow(currentRow);

      // Jika hanya teks kosong
      if (typeof row[0] === "string") {
        excelRow.getCell(1).value = row[0];
        currentRow++;
        continue;
      }

      const value = row[0].value;
      const bold = row[0].bold ?? false;
      const size = row[0].size ?? 12;
      const color = row[0].color;
      const fgColor = row[0].fgColor;
      const subText = row[1] ?? "";
      const isHighlighted = row[2] === "highlight";

      const cell = excelRow.getCell(1);
      cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };

      if (isHighlighted || fgColor) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: fgColor ?? { argb: "ffffff00" },
        };
      }

      if (subText) {
        cell.value = {
          richText: [
            {
              text: `${value}\n`,
              font: { name: "Cambria", bold, size, color: color ? { argb: color } : undefined },
            },
            {
              text: subText, font: { name: "Cambria", size: 10 },
            },
          ],
        };
      } else {
        cell.value = value;
        cell.font = { name: "Cambria", bold, size, color: color ? { argb: color } : undefined };
      }

      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      currentRow++;
    }
    

    worksheetMV.columns = [
      { width: 50 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
    ];
    
  // Pemetaan baris untuk label
  const labelToRowMap = {};
  let currentParent = "";

  // Ambil semua tanggal unik
  // Ambil bulan dari data terakhir
  const rawTimestamps = dataList.map(d => new Date(d.timestamp));
  const lastDate = new Date(Math.max(...rawTimestamps));

  const year = lastDate.getFullYear();
  const month = lastDate.getMonth();

  const startDate = new Date(year, month, 1);            // 1-bulan
  const endDate = new Date(year, month + 1, 1);          // 1-bulan berikutnya

  // Buat array tanggal dari 1-bulan ke 1-bulan berikutnya
  const uniqueDates = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const withHour5 = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 5); // 05:00
    uniqueDates.push(withHour5);
  }

// Mapping shift ke kolom offset
const shiftToOffset = {
  "Shift 1": 0,
  "Shift 2": 1,
  "Shift 3": 2,
};

uniqueDates.forEach((date, dateIndex) => {
  const startCol = 2 + dateIndex * 3;
  const endCol   = startCol + 2;

  worksheetMV.mergeCells(
    `${worksheetMV.getColumn(startCol).letter}2:${worksheetMV.getColumn(endCol).letter}2`
  );

  /* ——— inilah perbaikannya ——— */
  const safeDate = new Date(date);          // salin
  safeDate.setHours(12, 0, 0, 0);           // ⬅️ 12:00 siang (zona Jakarta)
  const dateCell = worksheetMV.getCell(2, startCol);
  dateCell.value = safeDate;                // pakai tanggal “aman”
  /* ——— selesai ——— */

  dateCell.numFmt = 'dd-mmm-yyyy';          // jam tak akan ditampilkan
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  dateCell.font      = { bold: true, size: 12 };
  dateCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ff00cc66' } };
  dateCell.border    = { top:{style:'thin'}, left:{style:'thin'},
                         bottom:{style:'thin'}, right:{style:'thin'} };

  // Tulis shift di baris 3
  Object.entries(shiftToOffset).forEach(([shift, offset]) => {
    const col = startCol + offset;
    const shiftCell = worksheetMV.getCell(3, col);
    shiftCell.value = shift;
    shiftCell.alignment = { horizontal: "center", vertical: "middle" };
    shiftCell.font = { size: 12, bold: true };
    shiftCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ffffff00' },
    };
    shiftCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
});

  for (let row = 5; row <= worksheetMV.rowCount; row++) {
    const cell = worksheetMV.getCell(`A${row}`);
    const val = cell.value;
    let label = "";

    if (val && typeof val === "object" && val.richText) {
      label = val.richText.map(rt => rt.text).join('').replace(/\n/g, '').trim();
    } else if (val) {
      label = String(val).replace(/\n/g, '').trim();
    }

    if (!label) continue;

    console.log(`Baris ${row}: "${label}"`);

    // Cek apakah ini parent
    if (/^MV-[A-Z] TRAFO \d+$/i.test(label)) {
      currentParent = label;
      console.log(`-> Ditetapkan sebagai parent: "${currentParent}"`);
      continue;
    }

    // Tambahkan aturan parent alternatif
    if (/^20kV MV.*(Incomer|OutGoing)$/i.test(label)) {
      currentParent = label;
      console.log(`-> Ditetapkan sebagai parent alternatif: "${currentParent}"`);
      continue;
    }

    if (!labelToRowMap[label]) {
      labelToRowMap[label] = row;
      console.log(`-- Pemetaan: ${label} => Row ${row}`);
    } else {
      console.log(`-- SKIP: Label "${label}" sudah dipetakan ke Row ${labelToRowMap[label]}`);
    }


    if (currentParent && label.startsWith("Stand")) {
      const fullLabel = `${currentParent} - ${label}`;
      labelToRowMap[fullLabel] = row;
      console.log(`-- Pemetaan: ${fullLabel} => Row ${row}`);
    } else {
        labelToRowMap[label] = row;
        console.log(`-- Pemetaan: ${label} => Row ${row}`);
    }

    // Debugging untuk memeriksa currentParent sebelum pemetaan
    console.log(`currentParent: "${currentParent}"`);
  }

// Isi data
dataList.forEach(entry => {
  const entryDate = stripTime(new Date(entry.timestamp));
  const dateIndex = uniqueDates.findIndex(d =>
    d.getFullYear() === entryDate.getFullYear() &&
    d.getMonth() === entryDate.getMonth() &&
    d.getDate() === entryDate.getDate()
  );

  if (dateIndex === -1) return;

  const shiftOffset = shiftToOffset[entry.shift];
  if (shiftOffset === undefined) return;

  const targetCol = 2 + dateIndex * 3 + shiftOffset; // Hitung kolom target

  for (const [label, value] of Object.entries(entry.readings)) {
    const trimmedLabel = label.trim();
    const rowIndex = labelToRowMap[trimmedLabel];
    if (!rowIndex) {
      console.warn(`Label tidak ditemukan: "${trimmedLabel}"`);
      continue;
    }

    const cell = worksheetMV.getCell(rowIndex, targetCol);
    cell.value = parseFloat(value);
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.font = { size: 12, bold: true };
    cell.numFmt = '#,##0';
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }
  const totalCol = 2 + uniqueDates.length * 3; // 1 kolom deskripsi + 3xN
  worksheetMV.columns = Array.from({ length: totalCol }, (_, i) => ({
    width: i === 0 ? 50 : 15
  }));

  // Tambahkan border tipis ke semua sel data yang kosong
  for (let row = 5; row <= worksheetMV.rowCount; row++) {
  const labelCell = worksheetMV.getCell(`A${row}`);
  let labelText = "";

  if (labelCell.value && typeof labelCell.value === "object" && labelCell.value.richText) {
    labelText = labelCell.value.richText.map(rt => rt.text).join('').replace(/\n/g, '').trim();
  } else if (labelCell.value) {
    labelText = String(labelCell.value).trim();
  }

  const isStandReading = /Stand kWh|Stand kVARh/i.test(labelText);

  if (!isStandReading) continue;

  for (let col = 2; col < totalCol; col++) {
    const cell = worksheetMV.getCell(row, col);
    if (cell.value === undefined || cell.value === null || cell.value === "") {
      cell.value = 0;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { size: 12, bold: true, color: { argb: 'FFFF0000' } }; // Merah
      cell.numFmt = '#,##0';
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }
}

  for (let col = 2; col < totalCol; col++) {
  const colLetter = worksheetMV.getColumn(col).letter;
  const row16Targets = [20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53];
  const row17Targets = [21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54];
  const row9Targets = [6,7,8];

  const sumRange16 = row16Targets.map(r => `${colLetter}${r}`).join(","); // ← koma
  const sumRange17 = row17Targets.map(r => `${colLetter}${r}`).join(","); // ← koma
  const sumRange9 = row9Targets.map(r => `${colLetter}${r}`).join(","); // ← koma

  const cell16 = worksheetMV.getCell(16, col);
  cell16.value = { formula: `SUM(${sumRange16})` };
  cell16.alignment = { horizontal: "center", vertical: "middle" };
  cell16.font = { bold: true, size: 12, color: {argb: "ffff0000"} };
  cell16.numFmt = '#,##0';
  cell16.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const cell17 = worksheetMV.getCell(17, col);
  cell17.value = { formula: `SUM(${sumRange17})` };
  cell17.alignment = { horizontal: "center", vertical: "middle" };
  cell17.font = { bold: true, size: 12, color: {argb: "ffff0000"} };
  cell17.numFmt = '#,##0';
  cell17.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const cell9 = worksheetMV.getCell(9, col);
  cell9.value = { formula: `SUM(${sumRange9})` };
  cell9.alignment = { horizontal: "center", vertical: "middle" };
  cell9.font = { bold: true, size: 12, color: {argb: "ff0000FF"} };
  cell9.numFmt = '#,##0';
  cell9.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
}


  // Warna kuning untuk baris 47 dan 48 mulai dari kolom B
  [13, 14, 47, 48].forEach(rowNum => {
    const row = worksheetMV.getRow(rowNum);
    for (let col = 2; col < totalCol; col++) {
      const cell = row.getCell(col);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" }, // Kuning
      };
    }
  });

  const fontColorByRow = {
  6: "ff002060",
  7: "ff002060",
  8: "ffE26B0A",
  9: "ff0000FF",
  10: "ff800000",
  13: "ffFF0000",
  14: "ffFF0000",
  16: "ffFF0000",
  17: "ffFF0000",
  };

  Object.entries(fontColorByRow).forEach(([rowNumStr, color]) => {
    const rowNum = parseInt(rowNumStr);
    const row = worksheetMV.getRow(rowNum);
    for (let col = 2; col < totalCol; col++) {
      const cell = row.getCell(col);
      if (typeof cell.value === "number") {
        cell.font = {
          size: 12,
          bold: true,
          color: { argb: color },
        };
      }
    }
  });

    // Simpan tanggal terakhir di sel B2 (format: YYYY-MM-DD)
  const worksheet = workbook.getWorksheet("Read Daily MV");
  worksheet.getCell("B2").value = lastDate.toISOString().split("T")[0]; // yyyy-mm-dd
  
  });
  return uniqueDates;
};

export default ReadDailyMV;
