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

const topbottomBorder = {
  top: {style: "thin" },
  bottom: { style : "thin" }
};

const headerStyle = {
  font: { bold: true, size: 14 },
  alignment: { horizontal: "center", vertical: "middle" },
  border: defaultBorder
};

const leftBoldStyle = {
  font: { bold: true, size: 14 },
  alignment: { horizontal: "left", vertical: "middle" },
  border: defaultBorder
};

const numberStyle = {
  numFmt: '#,##0',
  alignment: { horizontal: "center", vertical: "middle" },
  border: defaultBorder
};

const RupiahStyle = {
  numFmt: '"Rp"#,##0',
  alignment: { horizontal: "center", vertical: "middle" },
  border: defaultBorder
};

const HargaPLNStyle = {
  font: { size: 12 },
  numFmt: '"Rp"#,##0.00',
  alignment: { horizontal: "center", vertical: "middle" },
  border: defaultBorder
};

const TotalMonthlyMV = (workbook, uniqueDates) => {
  const ws = workbook.addWorksheet("Total Monthly MV", {
    properties: { tabColor: { argb: "FFFF0000" } }
  });
  ws.views = [{ showGridLines: false }];

  const cellsToFormat = [
    "C9", "E9", "C10", "F10", "C11",
    "C13", "E13", "F13", // sudah ada, tapi tetap bisa disertakan
    "C15", "E15", "C16",
    "C27", "D27", "E27",
    "C28", "F28",
    "C29", "D29", "E29", "F29",
    "C31", "E31", "F31",
    "J10", "K10", "L10",
    "J11", "M11",
    "J12", "K12", "L12", "M12",
    "J14", "L14", "M14"
  ];

  cellsToFormat.forEach(cell => {
    const currentCell = ws.getCell(cell);
    currentCell.numFmt = '"Rp"#,##0.00';
  });

  // Ambil tanggal dari worksheet 'Reading MV', cell E2 (format: 'YYYY-MM-DD')
  const sourceSheet = workbook.getWorksheet("Read Daily MV");
  const rawDateStr = sourceSheet?.getCell("B2").value;

  let monthName = "Unknown";
  let day = null, month = null, year = null;

  if (typeof rawDateStr === "string") {
    const [yearStr, monthStr, dayStr] = rawDateStr.split("-");
    year = Number(yearStr);
    month = Number(monthStr);
    day = Number(dayStr);

    const monthMap = {
      1: "January",
      2: "February",
      3: "March",
      4: "April",
      5: "May",
      6: "June",
      7: "July",
      8: "August",
      9: "September",
      10: "October",
      11: "November",
      12: "December"
    };
    monthName = monthMap[month] || "Invalid";
  }

  let b4Date = "", b5Date = "";
  if (!isNaN(month) && !isNaN(year)) {
    const currentMonthDate = new Date(year, month - 1, 1);
    const nextMonthDate = new Date(year, month, 1); // Rollover otomatis

    const formatDate = (date) =>
      `${date.getDate()}-${date.toLocaleString("en-US", { month: "short" })}-${date.getFullYear()}`;

    b4Date = formatDate(currentMonthDate);
    b5Date = formatDate(nextMonthDate);
  }

  const entries = [
    //Header Utama
    [`A1:F1`, `Total Consumption Bulan ${monthName} for KPI`, { font: { bold: true, size: 18 }, alignment: { horizontal: "center", vertical: "middle" } }],

    //Manual Reading APP PLN Jam.10:00 WIB(Invoice)
    ["A2:F2", "Manual Reading APP PLN Jam.10:00 WIB(Invoice)", { font: { bold: true, size: 16 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF00B050" } } }],
    ["A3", "Reading", headerStyle],
    ["B3", "Date", headerStyle],
    ["C3:D3", "LWBP", headerStyle],
    ["E3", "WBP", headerStyle],
    ["F3", "KVARH", headerStyle],
    ["A4", "Stand kWh Lalu", leftBoldStyle],
    ["A5", "Stand kWh Akhir", leftBoldStyle],
    ["B4", b4Date, headerStyle],
    ["B5", b5Date, headerStyle],
    ["A6:B6", "DiFFerence (Stnd Akhir - Stnd Lalu)", leftBoldStyle],
    ["A7:B7", "Consumption KWH (DiFF*8)", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A8:B8", "Total Consumption (LWBP1 + LWBP2 + WBP)", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A9:B9", "Energy expenses (IDR)", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A10:B10", "Total Energy expenses (LWBP1 + LWBP2 + WBP)", { font: { bold: true, size: 14, color: { argb: "FF963634" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A11:B11", "Energy Expenses * PPJ (3%)", { font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A12:B13", "Basic Price March 2017", { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A14", "* K x LWBP (1,4 ≤ K ≤ 2)                    K:", { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A15", ""],
    ["A16:B16", "Total Energy expenses (IDR)", { font: { bold: true, size: 14, color: { argb: "FFC00000" }}, alignment: leftBoldStyle.alignment, border: defaultBorder}],
    ["B14", 1.50, { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["C12:D12", "LWBP", { font: { bold: true, size: 12 }, alignment: headerStyle.alignment, border: defaultBorder }],
    ["E12", "WBP*", { font: { bold: true, size: 12 }, alignment: headerStyle.alignment, border: defaultBorder }],
    ["F12", "KVARH", { font: { bold: true, size: 12 }, alignment: headerStyle.alignment, border: defaultBorder }],
    ["F9", "No Payment", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: headerStyle.alignment, border: defaultBorder }],

    // Manual Reading PLN Jam.08:00 WIB(Daily)
    ["A18:F18", "Manual Reading PLN Jam.08:00 WIB(Daily)", { font: { bold: true, size: 16 }, alignment: leftBoldStyle.alignment, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF92D050" } } }],
    ["A19", "Reading", headerStyle],
    ["B19", "Date", headerStyle],
    ["C19", "LWBP-1", headerStyle],
    ["D19", "LWBP-1", headerStyle],
    ["E19", "WBP", headerStyle],
    ["F19", "KVARH", headerStyle],
    ["A20", "Stand kWh Lalu", leftBoldStyle],
    ["A21", "Stand kWh Akhir", leftBoldStyle],
    ["B20", { formula: "B4" }, headerStyle],
    ["B21", { formula: "B5" }, headerStyle],
    ["B36", { formula: "B4" }, headerStyle],
    ["B37", { formula: "B5" }, headerStyle],
    ["A22:B22", "DiFFerence (Stnd Akhir - Stnd Lalu)", leftBoldStyle],
    ["A23:B23", "Consumption KWH (DiFF*8)", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A24", "Discount kWH 30% for LWBP1 if consumption    >", { font: { bold: true, size: 14 }, alignment: leftBoldStyle.alignment, border: topbottomBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["B24", 824645, { font: { bold: true, italic:true, size: 14, color:{ argb: "FFC00000"} }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } } ],
    ["A25:B25", "Total Consumption (LWBP1 + LWBP2 + WBP)", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: leftBoldStyle.alignment, border: defaultBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["A26:B26", "Selisih dengan PLN", { font: { bold: true, size: 14 }, alignment: leftBoldStyle.alignment, border: defaultBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFF5050" } } }],
    ["A27:B27", "Energy expenses (IDR)", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A28:B28", "Total Energy expenses (LWBP1 + LWBP2 + WBP)", { font: { bold: true, size: 14, color: { argb: "FF963634" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A29:B29", "Energy Expenses * PPJ (3%)", { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["A30:B31", "Basic Price March 2017", { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A32", "* K x LWBP (1,4 ≤ K ≤ 2)                    K:", { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["B32", 1.50, { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["C30:D30", "LWBP", { font: { bold: true, size: 12 }, alignment: headerStyle.alignment, border: defaultBorder }],
    ["E30", "WBP*", { font: { bold: true, size: 12 }, alignment: headerStyle.alignment, border: defaultBorder }],
    ["F30", "KVARH", { font: { bold: true, size: 12 }, alignment: headerStyle.alignment, border: defaultBorder }],
    ["F27", "No Payment", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: headerStyle.alignment, border: defaultBorder }],
    
    // Manual Reading MV-I Jam.08:00 WIB(Daily)
    ["A34:D34", "Manual Reading MV-I Jam.08:00 WIB(Daily)", { font: { bold: true, size: 16 }, alignment: leftBoldStyle.alignment, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FF66FF99" } } }],
    ["A35", "Reading", headerStyle],
    ["B35", "Date", headerStyle],
    ["C35", "KWH", headerStyle],
    ["D35", "KVARH", headerStyle],
    ["A36", "Stand Lalu", leftBoldStyle],
    ["A37", "Stand Akhir", leftBoldStyle],
    ["A38:B38", "DiFFerence (Stnd Akhir - Stnd Lalu)/1000", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["A39:B39", "Selisih dengan PLN", { font: { bold: true, size: 14 }, alignment: leftBoldStyle.alignment, border: defaultBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFF5050" } } }],

    // Kolom H–M: Estimate invoice PLN August 2024
    ["H2:M2", "Estimate invoice PLN August 2024", { font: { bold: true, size: 16 }, alignment: leftBoldStyle.alignment, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["H3", "Reading", headerStyle],
    ["I3", "Date", headerStyle],
    ["J3", "LWBP-1", headerStyle],
    ["K3", "LWBP-2", headerStyle],
    ["L3", "WBP", headerStyle],
    ["M3", "KVARH", headerStyle],
    ["H4", "Stand kWh Lalu", leftBoldStyle],
    ["H5", "Stand kWh Akhir", leftBoldStyle],
    ["I4", { formula: "B4" }, headerStyle],
    ["I5", { formula: "B5" }, headerStyle],
    ["H6:I6", "DiFFerence (Stnd Akhir - Stnd Lalu)", leftBoldStyle],
    ["H7:I7", "Consumption KWH (DiFF*8)", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["H8", "Discount kWH 30% for LWBP1 if consumption    >", { font: { bold: true, size: 14 }, alignment: leftBoldStyle.alignment, border: topbottomBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["I8", { formula: "B24" }, { font: { bold: true, italic:true, size: 14, color:{ argb: "FFC00000"} }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } } ],
    ["H9:I9", "Total Consumption (LWBP1 + LWBP2 + WBP)", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: leftBoldStyle.alignment, border: defaultBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["H10:I10", "Energy Expenses (IDR)", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["H11:I11", "Total Energy expenses (LWBP1 + LWBP2 + WBP)", { font: { bold: true, size: 12, color: { argb: "FF963634" } }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["H12:I12", "Energy Expenses * PPJ (3%)", { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["H13:I14", "Basic Price March 2017", { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["H15", "* K x LWBP (1,4 ≤ K ≤ 2)                    K:", { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["I15", 1.50, { font: { size: 12 }, alignment: leftBoldStyle.alignment, border: defaultBorder }],
    ["J13:K13", "LWBP", { font: { bold: true, size: 12 }, alignment: headerStyle.alignment, border: defaultBorder }],
    ["L13", "WBP*", { font: { bold: true, size: 12 }, alignment: headerStyle.alignment, border: defaultBorder }],
    ["M13", "KVARH", { font: { bold: true, size: 12 }, alignment: headerStyle.alignment, border: defaultBorder }],
    ["M10", "No Payment", { font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, alignment: headerStyle.alignment, border: defaultBorder }],

    //Formula Manual Reading APP PLN Jam.10:00 WIB(Invoice)
    ["C4:D4", { formula: "J4+K4" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["C5:D5", { formula: "J5+K5" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["E4", { formula: "L4" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["E5", { formula: "L5" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["F4", { formula: "M4" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["F5", { formula: "M5" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["C6", { formula: "C5-C4" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["D6", { formula: "D5-D4" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["E6", { formula: "E5-E4" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["F6", { formula: "F5-F4" }, { ...numberStyle, font: { bold: true, size: 14 } }],
    ["C7", { formula: "C6*8" }, { ...numberStyle, font: { bold: true, size: 14, color: { argb: "FF0000FF" } } }],
    ["D7", { formula: "D6*8" }, { ...numberStyle, font: { bold: true, size: 14, color: { argb: "FF0000FF" } } }],
    ["E7", { formula: "E6*8" }, { ...numberStyle, font: { bold: true, size: 14, color: { argb: "FF0000FF" } } }],
    ["F7", { formula: "F6*8" }, { ...numberStyle, font: { bold: true, size: 14, color: { argb: "FF0000FF" } } }],
    ["C8", { formula: "C7+E7" }, { ...numberStyle, font: { bold: true, size: 14 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["D8", { formula: "D7+F7+E7" }, { ...numberStyle, font: { bold: true, size: 14 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["E8", { formula: "E7+F7" }, { ...numberStyle, font: { bold: true, size: 14 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["F8", { formula: "F7" }, { ...RupiahStyle, font: { bold: true, size: 14, color: { argb: "FF0000FF" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["C9:D9", { formula: "C7*C13" }, { ...RupiahStyle, font: { bold: true, size: 14, color: { argb: "FF0000FF" } } }],
    ["E9", { formula: "E7*E13" }, { ...RupiahStyle, font: { bold: true, size: 14 }, color: { argb: "FF0000FF" } }],
    ["C10:E10", { formula: "C9+E9" }, { ...RupiahStyle, font: { bold: true, size: 14, color: { argb: "FF963634" } } }],
    ["F10", { formula: "F13+F8" }, { ...RupiahStyle, font: { bold: true, size: 14, color: { argb: "FFC00000" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["C11:E11", { formula: "0.03*C10" }, { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["F11", "", { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["C13:D13", 1035.78, HargaPLNStyle],
    ["E13", { formula: "B14*C13" }, HargaPLNStyle ],
    ["F13", 1114.74, HargaPLNStyle],
    ["C14:F14", "", headerStyle],
    ["C15:D15", { formula: "C10" }, { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["E15:F15", { formula: "C11+E11" }, { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["C16:F16", { formula: "C15+E15" }, { ...RupiahStyle, font: { bold: true, size: 20, color: { argb: "FFC00000" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],

    //Formula Manual Reading PLN Jam.08:00 WIB(Daily)
    ["C20", { formula : "'Reading MV'!B6" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["C21", { formula : "'Reading MV'!AH6" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["C22", { formula : "C21-C20" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["C23", { formula : "C22*8" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["C24", { formula : "B24+D24" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FFFF0000" } } }],
    ["C25", { formula : "C23+D23+E23" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["C26:E26", { formula : "D25-D8" }, { ...numberStyle, font: { bold:true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFF5050" } } }],
    ["C27", { formula : "C23*C31" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["C28:E28", { formula : "C27+D27+E27+F29" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FF963634" } } }],
    ["C29", { formula : "C27*3%" }, { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["C31:D31", { formula : "C13" }, HargaPLNStyle],
    ["D20", { formula : "'Reading MV'!B7" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["D21", { formula : "'Reading MV'!AH7" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["D22", { formula : "D21-D20" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["D23", { formula : "D22*8" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["D24", { formula : "E24-(E24*30%)" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FFFF0000" } } }],
    ["D25:E25", { formula : "C24+D23+E23" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["D27", { formula : "C31*D23" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["D29", { formula : "D27*3%" }, { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["E20", { formula : "'Reading MV'!B8" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["E21", { formula : "'Reading MV'!AH8" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["E22", { formula : "E21-E20" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["E23", { formula : "E22*8" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["E24", { formula : "C23-B24" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FFFF0000" } } }],
    ["E27", { formula : "E31*E23" }, { ...RupiahStyle, font: { bold:true, size: 12 }, color: { argb: "FF0000FF" } }],
    ["E29", { formula : "E27*3%" }, { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["E31", { formula : "B32*C31" }, { ...RupiahStyle, font: { size: 12 } }],
    ["F20", { formula : "'Reading MV'!B10" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["F21", { formula : "'Reading MV'!AH10" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["F22", { formula : "F21-F20" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["F23", { formula : "F22*8" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["F24", "", numberStyle],
    ["F25", { formula : "F23" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["F26", { formula : "F23-F8" }, { ...numberStyle, font: { bold:true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFF5050" } } }],
    ["F28", { formula : "F31*F25" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FFC00000" } } }],
    ["F29", { formula : "SUM(C29:E29)" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FF963634" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["F31", { formula : "F13" }, HargaPLNStyle],
    
    //Formula Manual Reading MV-I Jam.08:00 WIB(Daily)
    ["C36", { formula : "'Reading MV'!B13" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["C37", { formula : "'Reading MV'!AH13" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["C38", { formula : "C37-C36" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["C39", { formula : "C38-C8" }, { ...numberStyle, font: { bold:true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFF5050" } } }],
    ["D36", { formula : "'Reading MV'!B14" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["D37", { formula : "'Reading MV'!AH14" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["C38", { formula : "C37-C36" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["D38", { formula : "D37-D36" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["D39", { formula : "D38-F7" }, { ...numberStyle, font: { bold:true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFF5050" } } }],

    //Formula Manual Reading MV-I Jam.08:00 WIB(Daily)
    ["J4", { formula : "C20" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["J5", { formula : "C21" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["J6", { formula : "J5-J4" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["J7", { formula : "J6*8" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["J8:M8", "", headerStyle],
    ["J9", { formula : "J7+K7+L7" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["J10", { formula : "J14*J7" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["J11:L11", { formula : "J10+K10+L10+M12" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FF963634" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFFF00" } } }],
    ["J12", { formula : "J10*3%" }, { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["J14:K14", { formula : "C13" }, HargaPLNStyle ],
    ["K4", { formula : "D20" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["K5", { formula : "D21" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["K6", { formula : "K5-K4" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["K7", { formula : "K6*8" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["K9:L9", { formula : "J8+K7+L7" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["K10", { formula : "J14*K7" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["K12", { formula : "K10*3%" }, { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["L4", { formula : "E20" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["L5", { formula : "E21" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["L6", { formula : "L5-L4" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["L7", { formula : "L6*8" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["L10", { formula : "L14*L7" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["L12", { formula : "L10*3%" }, { ...RupiahStyle, font: { size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["L14", { formula : "I15*J14" }, { ...RupiahStyle, font: { size: 12 } }],
    ["M4", { formula : "F20" }, { ...numberStyle, font: { size: 12 } }],
    ["M5", { formula : "F21" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["M6", { formula : "M5-M4" }, { ...numberStyle, font: { bold:true, size: 12 } }],
    ["M7", { formula : "M6*8" }, { ...numberStyle, font: { bold:true, size: 12, color: { argb: "FF0000FF" } } }],
    ["M9", { formula : "M7" }, { ...numberStyle, font: { bold:true, size: 12 }, color: { argb: "FF0000FF" }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFCD5B4" } } }],
    ["M11", { formula : "M14*M9" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FFC00000" } } }],
    ["M12", { formula : "SUM(J12:L12)" }, { ...RupiahStyle, font: { bold:true, size: 12, color: { argb: "FF963634" } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFDE9D9" } } }],
    ["M14", { formula : "F13" }, HargaPLNStyle],

    //Chart
    ["I18", "LWBP 1", {font: { size: 12}}],
    ["I19", "LWBP 2", {font: { size: 12}}],
    ["I20", "WBP", {font: { size: 12}}],
    ["J18", { formula : "J7/J9" }, {font: { size: 12}}],
    ["J19", { formula : "K7/J9" }, {font: { size: 12}}],
    ["J20", { formula : "L7/J9" }, {font: { size: 12}}],
  ];

  entries.forEach(([cell, value, style]) => setCell(ws, cell, value, style));

  ws.columns = [
    { key: 'A', width: 56.22 },
    { key: 'B', width: 15.56 },
    { key: 'C', width: 22.22 },
    { key: 'D', width: 20.22 },
    { key: 'E', width: 21.22 },
    { key: 'F', width: 24.67 },
    { key: 'G', width: 13.56 },
    { key: 'H', width: 58.78 },
    { key: 'I', width: 15.67 },
    { key: 'J', width: 19.11 },
    { key: 'K', width: 26.11 },
    { key: 'L', width: 20.22 },
    { key: 'M', width: 32.11 }
  ];
};

export default TotalMonthlyMV;
