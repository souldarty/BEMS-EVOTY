const DiffMV = (workbook, uniqueDates) => {
  const worksheetMV = workbook.addWorksheet("Diff MV", {
  properties: { tabColor: { argb: 'FFFF0000' } }
  });
  worksheetMV.views = [{ showGridLines: false }];

  function columnNumberToLetter(n) {
    let s = '';
    while (n > 0) {
      let m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  const colorbg = {
    "ff99FFCC": [10, 11],
    "ff99FF99": [13, 14, 25, 36, 43, 50],
    "ff92D050": [16, 27, 38, 45],
    "ffD9D9D9": [17, 18, 21, 22, 28, 29, 32, 33, 39, 40, 46, 47],
    "ffFCD5B4": [19, 20, 23, 24, 30, 31, 34, 35, 41, 42, 48, 49]
  };

  const colorfont = {
    "ff16365C": [4, 5, 6],
    "ffFF0000": [7, 10, 11, 12],
    "ffC00000": [8],
    "FF99FFCC": [66, 68, 73, 77, 81, 83, 87, 89, 91, 95, 97, 99, 102, 104, 106, 109, 111, 113, 115, 117]
  };

  // Isi baris 2 dari kolom B ke kanan dengan rumus dari sheet 'Reading MV'
  // Mengisi baris ke-2 (row 2) dari kolom B ke kanan dengan formula =('Reading MV'!B2), =('Reading MV'!C2), dst.
  uniqueDates.forEach((_, index) => {
    const colIdx = 2 + index;
    const colLetter = columnNumberToLetter(colIdx);
    const cell = worksheetMV.getCell(1, colIdx); // ganti ke baris 1
    // Merge cell dari baris 1 dan 2
    worksheetMV.mergeCells(1, colIdx, 2, colIdx);
    // Isi formula
    cell.value = { formula: `'Reading MV'!${colLetter}2` };
    // Format tampilan
    cell.font = { bold: true, size: 12 };
    cell.numFmt = 'dd-mmm-yyyy';
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00CC66' },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  const dateLabel = worksheetMV.getCell("A1");
  dateLabel.value = "DATE";
  dateLabel.font = { bold: true, size: 14 };
  dateLabel.alignment = { horizontal: "center", vertical: "middle" };
  dateLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ff00cc66' } };
  dateLabel.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

  const descCell = worksheetMV.getCell("A2");
  descCell.value = "DESCRIPTION";
  descCell.font = { bold: true, size: 14 };
  descCell.alignment = { horizontal: "center", vertical: "middle" };
  descCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ff00cc66' } };
  descCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

  // Data Rows
  const rows = [
    [{ value: "Consumption 20 KV GARDU PLN", bold: true, size: 12, color: "ff0000FF" }],
    [{ value: "LWBP-1", bold: true, size: 14, color: "ff002060", fgColor: {argb: "ff99ffcc"} }],
    [{ value: "LWBP-2", bold: true, size: 14, color: "ff002060", fgColor: {argb: "ff99ffcc"} }],
    [{ value: "WBP", bold: true, size: 14, color: "ffe26b0a", fgColor: {argb: "ff99ffcc"} }],
    [{ value: "Total Consumption", bold: true, size: 14, color: "ffFF0000", fgColor: {argb: "ff99ffcc"} }],
    [{ value: "kVARh", bold: true, size: 14, color: "ff800000", fgColor: {argb: "ff99ffcc"} }],
    [{ value: "Consumption 20KV MV-I", bold: true, size: 12, color: "ffFF0000" }],
    [{ value: "kWh Evoty", bold: true, size: 14, color: "ffff0000", fgColor: {argb: "ff99ffcc"} }],
    [{ value: "kVARh Evoty", bold: true, size: 14, color: "ffff0000", fgColor: {argb: "ff99ffcc"} }],
    [{ value: "Total Out Going Trafo", bold: true, size: 14 }],
    [{ value: "kWh", bold: true, size: 14, fgColor: {argb: "ff99FF99"} }],
    [{ value: "kVARh", bold: true, size: 14, fgColor: {argb: "ff99FF99"} }],
    [{ value: "Consumption @Out Going Trafo", bold: true, size: 12 }],
    [{ value: "MV-A Mixing", bold: true, size: 12, fgColor: {argb: "ff92D050"} }],
    [{ value: "kWh Trafo 1", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kVARh Trafo 1", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kWh Trafo 2", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "kVARh Trafo 2", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "KWh Trafo 3 (RBF1 Master)", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kVARh Trafo 3", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "KWh Trafo 4 (RBF2 Final)", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "kVARh Trafo 4", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "Total Kwh MV-A, Mixing", bold: true, size: 12, fgColor: {argb: "ff99FF99"} }],
    [{ value: " ", bold: true, size: 12 }],
    [{ value: "MV-B Semi Finishing", bold: true, size: 12, fgColor: {argb: "ff92D050"} }],
    [{ value: "kWh Trafo 1", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kVARh Trafo 1", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kWh Trafo 2", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "kVARh Trafo 2", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "KWh Trafo 3", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kVARh Trafo 3", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "KWh Trafo 4", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "kVARh Trafo 4", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "Total Kwh MV-B, Semi Finishing", bold: true, size: 12, fgColor: {argb: "ff99FF99"} }],
    [{ value: " ", bold: true, size: 12 }],
    [{ value: "MV-C Curing and Tyre Building", bold: true, size: 12, fgColor: {argb: "ff92D050"} }],
    [{ value: "kWh Trafo 1", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kVARh Trafo 1", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kWh Trafo 2", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "kVARh Trafo 2", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "Total Kwh MV-C, Curing& TBM", bold: true, size: 12, fgColor: {argb: "ff99FF99"} }],
    [{ value: " ", bold: true, size: 12 }],
    [{ value: "MV-U Utility", bold: true, size: 12, fgColor: {argb: "ff92D050"} }],
    [{ value: "kWh Trafo 1", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kVARh Trafo 1", bold: true, size: 12, fgColor: {argb: "ffD9D9D9"} }],
    [{ value: "kWh Trafo 2", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "kVARh Trafo 2", bold: true, size: 12, fgColor: {argb: "ffFCD5B4"} }],
    [{ value: "Total Kwh MV-U, Utility", bold: true, size: 12, fgColor: {argb: "ff99FF99"} }],
  ];

  let currentRow = 3;
  for (const row of rows) {
    const excelRow = worksheetMV.getRow(currentRow);
    const data = row[0];

    if (typeof data === "string" || (data.value && data.value.trim() === "")) {
      excelRow.getCell(1).value = data.value || data;
      currentRow++;
      continue;
    }

    const cell = excelRow.getCell(1);
    cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
    cell.font = {
      name: "Calibri",
      bold: data.bold ?? false,
      size: data.size ?? 12,
      color: data.color ? { argb: data.color } : undefined,
    };

    if (row[1]) {
      cell.value = {
        richText: [
          {
            text: `${data.value}\n`,
            font: {
              name: "Calibri",
              bold: data.bold ?? false,
              size: data.size ?? 12,
              color: data.color ? { argb: data.color } : undefined,
            },
          },
          {
            text: row[1],
            font: {
              name: "Calibri",
              size: 10,
            },
          },
        ],
      };
    } else {
      cell.value = data.value;
    }

    if (data.fgColor) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: data.fgColor,
      };
    }

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    currentRow++;
  }

  // Set lebar kolom
  worksheetMV.columns = [
    { width: 33 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];

   // Penambahan rumus
  const formulaMap = {
    3: (col) => `=((${col}4+${col}5)*'Total Monthly MV'!$J$14+${col}6*'Total Monthly MV'!$L$14)/1000000`,
    4: (c, n) => `=('Reading MV'!${n}6-'Reading MV'!${c}6)*8`,
    5: (c, n) => `=('Reading MV'!${n}7-'Reading MV'!${c}7)*8`,
    6: (c, n) => `=('Reading MV'!${n}8-'Reading MV'!${c}8)*8`,
    7: (c, n) => `=('Reading MV'!${n}9-'Reading MV'!${c}9)*8`,
    8: (c, n) => `=('Reading MV'!${n}10-'Reading MV'!${c}10)*8`,
    9: (col) => `=${col}11/${col}10`,
    10: (c, n) => `='Reading MV'!${n}13-'Reading MV'!${c}13`,
    11: (c, n) => `='Reading MV'!${n}14-'Reading MV'!${c}14`,
    12: (col) => `=(${col}10-${col}7)/${col}7`,
    13: (col) => `=${col}17+${col}19+${col}21+${col}23+${col}28+${col}30+${col}32+${col}34+${col}39+${col}41+${col}46+${col}48`,
    14: (col) => `=${col}18+${col}20+${col}22+${col}24+${col}29+${col}31+${col}33+${col}35+${col}40+${col}42+${col}47+${col}49`,
    17: (c, n) => `='Reading MV'!${n}20-'Reading MV'!${c}20`,
    18: (c, n) => `='Reading MV'!${n}21-'Reading MV'!${c}21`,
    19: (c, n) => `='Reading MV'!${n}23-'Reading MV'!${c}23`,
    20: (c, n) => `='Reading MV'!${n}24-'Reading MV'!${c}24`,
    21: (c, n) => `='Reading MV'!${n}26-'Reading MV'!${c}26`,
    22: (c, n) => `='Reading MV'!${n}27-'Reading MV'!${c}27`,
    23: (c, n) => `='Reading MV'!${n}29-'Reading MV'!${c}29`,
    24: (c, n) => `='Reading MV'!${n}30-'Reading MV'!${c}30`,
    25: (col) => `=${col}17+${col}19+${col}21+${col}23`,
    28: (c, n) => `='Reading MV'!${n}32-'Reading MV'!${c}32`,
    29: (c, n) => `='Reading MV'!${n}33-'Reading MV'!${c}33`,
    30: (c, n) => `='Reading MV'!${n}35-'Reading MV'!${c}35`,
    31: (c, n) => `='Reading MV'!${n}36-'Reading MV'!${c}36`,
    32: (c, n) => `='Reading MV'!${n}38-'Reading MV'!${c}38`,
    33: (c, n) => `='Reading MV'!${n}39-'Reading MV'!${c}39`,
    34: (c, n) => `='Reading MV'!${n}41-'Reading MV'!${c}41`,
    35: (c, n) => `='Reading MV'!${n}42-'Reading MV'!${c}42`,
    36: (col) => `=${col}28+${col}30+${col}32+${col}34`,
    39: (c, n) => `='Reading MV'!${n}44-'Reading MV'!${c}44`,
    40: (c, n) => `='Reading MV'!${n}45-'Reading MV'!${c}45`,
    41: (c, n) => `='Reading MV'!${n}47-'Reading MV'!${c}47`,
    42: (c, n) => `='Reading MV'!${n}48-'Reading MV'!${c}48`,
    43: (col) => `=${col}39+${col}41`,
    46: (c, n) => `='Reading MV'!${n}50-'Reading MV'!${c}50`,
    47: (c, n) => `='Reading MV'!${n}51-'Reading MV'!${c}51`,
    48: (c, n) => `='Reading MV'!${n}53-'Reading MV'!${c}53`,
    49: (c, n) => `='Reading MV'!${n}54-'Reading MV'!${c}54`,
    50: (col) => `=${col}46+${col}48`,
  };

  uniqueDates.forEach((_, dateIdx) => {
    const offsetStart = 2 + dateIdx * 1;
    const offsetEnd = offsetStart + 1;
    const colLetterStart = columnNumberToLetter(offsetStart);
    const colLetterEnd = columnNumberToLetter(offsetEnd);
    const colIdx = 2 + dateIdx;

    Object.entries(formulaMap).forEach(([rowNum, formulaFn]) => {
      const row = parseInt(rowNum);
      const cell = worksheetMV.getCell(row, colIdx);
      const formula = formulaFn.length === 1 ? formulaFn(columnNumberToLetter(colIdx)) : formulaFn(colLetterStart, colLetterEnd);

      cell.value = { formula };
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };

      // Apply font color based on row
      Object.entries(colorfont).forEach(([color, rows]) => {
        if (rows.includes(row)) {
          cell.font = { ...cell.font, color: { argb: color } };
        }
      });

      // Special case for row 12: if result is negative, set bg color to red

      if (row === 12) {
        cell.numFmt = '0%';
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC9CA" }
        };
      } else if ([9].includes(row)) {
        cell.numFmt = '#,##0.000';
      } else {
        cell.numFmt = '#,##0';
      }
    });

    Object.entries(colorbg).forEach(([color, rows]) => {
      rows.forEach((row) => {
        uniqueDates.forEach((_, dateIdx) => {
          const colIdx = 2 + dateIdx;
          const cell = worksheetMV.getCell(row, colIdx);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        });
      });
    });

    // Tambah formula MAX di kolom AH (kolom ke-34)
    const maxColumnIdx = 34; // AH
    const maxColumnLetter = columnNumberToLetter(maxColumnIdx);

    // Baris-baris yang ingin DIKELUARKAN dari MAX
    const excludedRows = new Set([3, 9, 12, 15, 16, 26, 27, 37, 38, 44, 45]);

    for (let row = 3; row <= worksheetMV.rowCount; row++) {
      if (excludedRows.has(row)) continue;

      const firstDataColIdx = 2; // Kolom B
      const lastDataColIdx = 1 + uniqueDates.length; // Kolom terakhir dari data tanggal

      const firstDataColLetter = columnNumberToLetter(firstDataColIdx);
      const lastDataColLetter = columnNumberToLetter(lastDataColIdx);

      const maxCell = worksheetMV.getCell(row, maxColumnIdx);
      maxCell.value = {
        formula: `=SUM(${firstDataColLetter}${row}:${lastDataColLetter}${row})`,
      };
      maxCell.font = { italic: true };
      maxCell.alignment = { horizontal: "center", vertical: "middle" };
      maxCell.numFmt = '#,##0';
    }
  });

  worksheetMV.columns = Array.from({ length: 2 + uniqueDates.length }, (_, i) => ({ width: i === 0 ? 33 : 13 }));
};

export default DiffMV;