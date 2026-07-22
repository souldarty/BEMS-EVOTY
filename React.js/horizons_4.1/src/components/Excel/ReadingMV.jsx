const setCell = (ws, cellRange, value, options = {}) => {
  if (cellRange.includes(":")) ws.mergeCells(cellRange);
  const cell = ws.getCell(cellRange);
  cell.value = value;
  cell.font = options.font || {};
  cell.alignment = options.alignment || { horizontal: "left", vertical: "middle" };
  if (options.border) cell.border = options.border;
  if (options.fill) cell.fill = options.fill;
  return cell;
};

const defaultBorder = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
  left: { style: "thin" }
};

const headerStyle = {
  font: { bold: true, size: 14 },
  alignment: { horizontal: "center", vertical: "middle" },
  border: defaultBorder
};

const titleStyle = {
  font: { bold: true, size: 14 },
  alignment: { horizontal: "center", vertical: "middle", wrapText: true  },
  border: defaultBorder
};

const textStyle = {
  font: { bold: true, size: 12 },
  alignment: { horizontal: "center", vertical: "middle" },
  border: defaultBorder
};
const trafoStyle = {
  font: { bold: true, size: 12 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF92D050" } },
  alignment: { horizontal: "center", vertical: "middle" },
  border: defaultBorder
};

const ReadingMV = (workbook, startDateStr) => {
  const ws = workbook.addWorksheet("Reading MV", {
    properties: { tabColor: { argb: "FFFF0000" } }
  });
  ws.views = [{ showGridLines: false }];

  const entries = [
    //Kolom A
    ["A1", "Daily Energy Consumption STAND KWH Meter", titleStyle ],
    ["A2", "DATE", { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF00CC66" } } }],
    ["A3", "DESCRIPTION", { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF00CC66" } } }],
    ["A4", "Check By", { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["A5", "20 KV GARDU PLN", textStyle],
    ["A6", "Stand kWh LWBP-1", { ...headerStyle, font: { bold: true, size: 14, color: { argb: "FF002060" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A7", "Stand kWh LWBP-2", { ...headerStyle, font: { bold: true, size: 14, color: { argb: "FF002060" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A8", "Stand WBP", { ...headerStyle, font: { bold: true, size: 14, color: { argb: "FFE26B0A" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A9", "Total Stand kWh", { ...headerStyle, font: { bold: true, size: 14, color: { argb: "0000FF" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A10", "Stand kVarh", { ...headerStyle, font: { bold: true, size: 14, color: { argb: "FF800000" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A11", "", { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A12", "20KV MV-I Nat Grid Incomer", textStyle],
    ["A13", "Stand kWh", { ...headerStyle, font: { bold: true, size: 14, color: { argb: "FFFF0000" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A14", "Stand kVARh", { ...headerStyle, font: { bold: true, size: 14, color: { argb: "FFFF0000" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A15", "20KV MV Grid OutGoing", textStyle],
    ["A16", "Stand kWh", { ...headerStyle, font: { bold: true, size: 14, color: { argb: "FFFF0000" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A17", "Stand kVARh", { ...headerStyle, font: { bold: true, size: 14, color: { argb: "FFFF0000" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF99FFCC" } } }],
    ["A18", "Reading @Out Going Trafo", textStyle],
    ["A19", "MV-A TRAFO 1", trafoStyle],
    ["A20", "Stand kWh", textStyle],
    ["A21", "Stand kVARh", textStyle],
    ["A22", "MV-A TRAFO 2", trafoStyle],
    ["A23", "Stand kWh", textStyle],
    ["A24", "Stand kVARh", textStyle],
    ["A25", "MV-A TRAFO 3", trafoStyle],
    ["A26", "Stand kWh", textStyle],
    ["A27", "Stand kVARh", textStyle],
    ["A28", "MV-A TRAFO 4", trafoStyle],
    ["A29", "Stand kWh", textStyle],
    ["A30", "Stand kVARh", textStyle],
    ["A31", "MV-B TRAFO 1", trafoStyle],
    ["A32", "Stand kWh", textStyle],
    ["A33", "Stand kVARh", textStyle],
    ["A34", "MV-B TRAFO 2", trafoStyle],
    ["A35", "Stand kWh", textStyle],
    ["A36", "Stand kVARh", textStyle],
    ["A37", "MV-B TRAFO 3", trafoStyle],
    ["A38", "Stand kWh", textStyle],
    ["A39", "Stand kVARh", textStyle],
    ["A40", "MV-B TRAFO 4", trafoStyle],
    ["A41", "Stand kWh", textStyle],
    ["A42", "Stand kVARh", textStyle],
    ["A43", "MV-C TRAFO 1", trafoStyle],
    ["A44", "Stand kWh", textStyle],
    ["A45", "Stand kVARh", textStyle],
    ["A46", "MV-C TRAFO 2", trafoStyle],
    ["A47", "Stand kWh", { ...textStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["A48", "Stand kVARh", { ...textStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["A49", "MV-U TRAFO 1", trafoStyle],
    ["A50", "Stand kWh", textStyle],
    ["A51", "Stand kVARh", textStyle],
    ["A52", "MV-U TRAFO 2", trafoStyle],
    ["A53", "Stand kWh", textStyle],
    ["A54", "Stand kVARh", textStyle],

  ];

  entries.forEach(([cell, value, style]) => setCell(ws, cell, value, style));

  const sourceSheet = workbook.getWorksheet("Read Daily MV");
  const targetSheet = ws;

  const rawDate = sourceSheet.getCell("E2").value;

  if (rawDate) {
    const detectedDate = new Date(
      rawDate instanceof Date ? rawDate.getTime() :
      typeof rawDate === 'object' && rawDate.result ? new Date(rawDate.result).getTime() :
      new Date(rawDate).getTime()
    );

    const year = detectedDate.getFullYear();
    const month = detectedDate.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    let currentDate = new Date(startDate);
    let colIndex = 2; // Mulai dari kolom B (index 2)

    while (currentDate <= endDate) {
      const safeDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        12
      );

      const cell = targetSheet.getCell(2, colIndex);
      cell.value = safeDate;
      cell.numFmt = 'dd-mmm-yyyy';
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { size: 12, bold: true };
      cell.border = defaultBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF00CC66" } };

      currentDate.setDate(currentDate.getDate() + 1);
      colIndex++;
    }

    // Merge semua kolom tanggal dari baris 2 ke 3
    for (let i = 2; i < colIndex; i++) {
      targetSheet.mergeCells(2, i, 3, i);
    }

    const targetRows = [6,7,8,9,10,13,14,16,17,20,21,23,24,26,27,29,30,32,33,35,36,38,39,41,42,44,45,47,48,50,51,53,54];

    targetRows.forEach(row => {
    for (let col = 2; col < colIndex; col++) {
      function getExcelColumnName(colNum) {
        let columnName = '';
        while (colNum > 0) {
          let remainder = (colNum - 1) % 26;
          columnName = String.fromCharCode(65 + remainder) + columnName;
          colNum = Math.floor((colNum - 1) / 26);
        }
        return columnName;
      }

      const colLetter = getExcelColumnName(col);

      let formula = '';
      if (row === 9) {
        // SUM(B6;B7;B8) untuk kolom B, jadi kolom sesuai dengan colLetter dan baris tetap 6,7,8
        formula = `=SUM(${colLetter}6,${colLetter}7,${colLetter}8)`;
      } else if (row === 16) {
        // SUM(B20;B23;B26;B29;B32;B35;B38;B41;B44;B47;B50;B53)
        formula = `=SUM(${colLetter}20,${colLetter}23,${colLetter}26,${colLetter}29,${colLetter}32,${colLetter}35,${colLetter}38,${colLetter}41,${colLetter}44,${colLetter}47,${colLetter}50,${colLetter}53)`;
      } else if (row === 17) {
        // SUM(B21;B24;B27;B30;B33;B36;B39;B42;B45;B48;B51;B54)
        formula = `=SUM(${colLetter}21,${colLetter}24,${colLetter}27,${colLetter}30,${colLetter}33,${colLetter}36,${colLetter}39,${colLetter}42,${colLetter}45,${colLetter}48,${colLetter}51,${colLetter}54)`;
      } else {
        const sourceColIndex = 2 + (col - 2) * 3;
        const sourceCol = getExcelColumnName(sourceColIndex);
        formula = `='Read Daily MV'!${sourceCol}${row}`;
      }

      const cell = targetSheet.getCell(row, col);
      cell.value = { formula };
      cell.border = defaultBorder;
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.numFmt = '#,##0';

      // Tambahkan warna teks sesuai row
      if (row === 6 || row === 7) {
        cell.font.color = { argb: 'FF002060' };
      } else if (row === 8) {
        cell.font.color = { argb: 'FFE26B0A' };
      } else if (row === 9) {
        cell.font.color = { argb: 'FF0000FF' };
      } else if (row === 13 || row === 14 || row === 16 || row === 17) {
        cell.font.color = { argb: 'FFFF0000' };
      }

      // Tambahkan background untuk row tertentu
      if (row === 13 || row === 14 || row === 47 || row === 48) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' }
        };
      }
    }
  });

  }

  const maxColIdx = 34; // Kolom AH
  const excludedRows = new Set([3, 11, 12, 15, 18, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 52 ]);

  for (let row = 6; row <= 54; row++) {
    if (excludedRows.has(row)) continue;

    const startColLetter = "B";
    const endColLetter = "AG"; // Kolom 33

    const maxCell = ws.getCell(row, maxColIdx);
    maxCell.value = {
      formula: `=MAX(${startColLetter}${row}:${endColLetter}${row})`,
    };
    maxCell.font = { italic: true, size: 12 };
    maxCell.alignment = { horizontal: "center", vertical: "middle" };
    maxCell.numFmt = '#,##0';
  }


  const columns = [
  { key: 'A', width: 35.56 },
  ...'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(key => ({ key, width: 13 })),
  ...['AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH'].map(key => ({ key, width: 13 })),
  ];

  ws.columns = columns;
};

export default ReadingMV;
