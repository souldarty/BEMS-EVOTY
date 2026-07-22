const ReadLVSheet = (workbook) => {
  const worksheetLV = workbook.addWorksheet("Reading LV", {
  properties: { tabColor: { argb: 'FF00CC66' } }
  })
  worksheetLV.views = [
  { state: 'frozen',
    xSplit: 1,
    showGridLines: false }
];

  // Title
  worksheetLV.mergeCells("A1:D1");
  const titleCell = worksheetLV.getCell("A1");
  titleCell.value = "Daily Energy Consumption STAND KWH Meter";
  titleCell.font = { bold: true, size: 20 };
  titleCell.alignment = { horizontal: "center", vertical: "left" };
  titleCell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // Date Label
  const dateLabel = worksheetLV.getCell("A2");
  dateLabel.value = "DATE";
  dateLabel.font = { bold: true, size: 14 };
  dateLabel.alignment = { horizontal: "center", vertical: "middle" };
  dateLabel.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF00cc66' },
  };
  dateLabel.border = titleCell.border;

  // Header
  const headerRow = worksheetLV.getRow(3);
  const descCell = headerRow.getCell(1);
  descCell.value = "DESCRIPTION";
  descCell.font = { bold: true, size: 14 };
  descCell.alignment = { horizontal: "center", vertical: "middle" };
  descCell.fill = dateLabel.fill;
  descCell.border = titleCell.border;

  const nameRow = worksheetLV.getRow(4);
  const checkCell = nameRow.getCell(1);
  checkCell.value = "Check by";
  checkCell.font = { bold: true, size: 14 };
  checkCell.alignment = { horizontal: "center", vertical: "middle" };
  checkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  checkCell.border = titleCell.border;

  // Data rows setup (rows omitted for brevity; assume it's already defined)
  const rows = [
      [{ value: "MV-A Mixing", bold: true, size: 22 }],
      [{ value: "Incomer Trafo # 1", group: "groupB", bold: true, size: 18, color: "FFc00000", fgColor: {argb: "FFeeece1"} }],
      [{ value: "101-11-02", bold: true, size: 18 }, "BY1.1 TSE+RD 116.01"],
      [{ value: "101-11-11", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }, "BY1.1 Aux. MB (Mixer Control) + D&W 115.01"],
      [{ value: "101-06-01", bold: true, size: 18 }, "(Oil Storage)"],
      [{ value: "108-A1-LV01", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }, "(DB Lab/2)"],
      [{ value: "101-A2-LV01-2", bold: true, size: 18 }, "(DB Lab.Lighting)", "highlight"],
      [{ value: "MCC MV - A", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }, "( AHU MV - A )"],
      [{ value: "101-06-02", bold: true, size: 18 }, "Manual Small Chemical Dosing"],
      [{ value: "101-11-15", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }, "( Rubber Cutter )"],
      [{ value: "101-11-01", bold: true, size: 18 }],
      [{ value: "101-11-06", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }, "( Batch oFF control By 1.1 118.01 )"],
      [{ value: "101-A1-LV01", bold: true, size: 18 }, "(MCC/MR/01-AHU)"],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "Incomer Trafo # 2", group: "groupB", bold: true, size: 22, color: "FFc00000", fgColor: {argb: "FFeeece1"} }],
      [{ value: "101-21-23", bold: true, size: 18 }, "BY2.1 Aux. FC (Mixer Control) + D&W 215.01"],
      [{ value: "101-21-02", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }, "BY2.1.1˚ Roll Mill Distribution 400V 216.10"],
      [{ value: "101-21-03", bold: true, size: 18 }, "BY2.1.2˚ Roll Mill Distribution 400V 216.20"],
      [{ value: "101-21-04", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }, "BY2.1.3˚ Roll Mill Distribution 400V 216.30"],
      [{ value: "101-06-04", bold: true, size: 18 }, "Pneumatic Transport Service 10,02"],
      [{ value: "A-DG1-1-1", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }, "(ATS MV-A)"],
      [{ value: "DB A2-LV01-1", bold: true, size: 18 }, "(Power & Lighting)"],
      [{ value: "101.A2-LV01-1 - Non Industrial", bold: true, size: 18 }, "(Lighting Raw Material Elev.0)", "highlight"],
      [{ value: "NEW RAW MATERIAL WAREHOUSE EXPAND", bold: true, size: 18 }, "(Lighting Raw Material Elev.7) - Non Industri", "highlight"],
      [{ value: "DB A2-LV01-2", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }, "(Power & Lighting)"],
      [{ value: "101.A2-LV01-4  ELV 7", bold: true, size: 18 }, "(Power & Lighting RM. Warehouse) - - Non Industri", "highlight"],
      [{ value: "101-21-18", bold: true, size: 18 }, "(Bacth oFF control By 2.1 218. 01)"],
      [{ value: "101-21-01", bold: true, size: 18, fgColor: {argb: "FFeeece1"} }],
      [{ value: "A1-LV01", bold: true, size: 18 }, "(Power & Lighting)"],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "MV-B Semi Finishing", bold: true, size: 22 }],
      [{ value: "Incomer Trafo # 1", group: "groupC", bold: true, size: 18, color: "FFc00000", fgColor: {argb: "FFc5d9f1"} }],
      [{ value: "102-07-01", bold: true, size: 18 }, "Inner Liner (Mini Roller Head + Extruder 90mm)"],
      [{ value: "102-07-02", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }, "Extruder 1 (150mm)"],
      [{ value: "102-07-03", bold: true, size: 18 }, "Extruder 2 (150mm)"],
      [{ value: "102-07-04", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }, "Calender"],
      [{ value: "102-09-01", bold: true, size: 18 }, "Bead Building M/C 1"],
      [{ value: "102-10-01", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }, "Bead Building M/C 2"],
      [{ value: "102-13-01", bold: true, size: 18 }, "Bead Filler"],
      [{ value: "DB- SF/1", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }],
      [{ value: "B-DG1-1-1", bold: true, size: 18 }, "ATS MV B"],
      [{ value: "MCC # 6 non industri", bold: true, size: 18 }, "AC Canteen", "highlight"],
      [{ value: "MCC # 5 non industri", bold: true, size: 18 }, "AC Infirmary", "highlight"],
      [{ value: "B2 LV01", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }, "Lighting & Power Distribution"],
      [{ value: "B2 LV02", bold: true, size: 18 }, "Power Distribution"],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "Incomer Trafo # 2", group: "groupC", bold: true, size: 18, color: "FFc00000", fgColor: {argb: "FFc5d9f1"} }],
      [{ value: "102-04-01", bold: true, size: 18 }, "Ply Cutting"],
      [{ value: "102-05-01", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }, "Bias Cutter"],
      [{ value: "SPARE", bold: true, size: 18 }, "Mini Slitter"],
      [{ value: "102-01-01", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }, "Calender (250mm)"],
      [{ value: "102-01-03", bold: true, size: 18 }, "Textile Calender Open Mill"],
      [{ value: "102-01-04", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }, "Extruder#1 (250mm)"],
      [{ value: "102-01-05", bold: true, size: 18 }, "Extruder#2 (250mm)"],
      [{ value: "DB MCC #3", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }, "AC Production OFFice"],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "Incomer Trafo # 3", group: "groupC", bold: true, size: 18, color: "FFc00000", fgColor: {argb: "FFc5d9f1"} }],
      [{ value: "102-02-01", bold: true, size: 18 }],
      [{ value: "Spare", bold: true, size: 18, fgColor: {argb: "FFc5d9f1"} }],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "MV-C Curing & Fin.Product", bold: true, size: 22 }],
      [{ value: "Incomer Trafo # 1", group: "groupD", bold: true, size: 18, color: "FFc00000", fgColor: {argb: "FF99FFcc"} }],
      [{ value: "C1 LV01", bold: true, size: 18 }, "Lighting & Power Distribution"],
      [{ value: "104-C1-LV04", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "Spray painting & condensat"],
      [{ value: "MCC Vaccum pump", bold: true, size: 18 }, "Vaccum & condensat pump"],
      [{ value: "DB Mech # 3 non industri", bold: true, size: 18 }, "Exhaust TB,FP,Musholla & Sand blast", "highlight"],
      [{ value: "DB Mech # 3 non industri - Musholla", bold: true, size: 18, fgColor: {argb: "FFFFFF00"} }],
      [{ value: "Curing Line D", bold: true, size: 18 }, "Busduct Line D Curing"],
      [{ value: "Curing Line E", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "Busduct Line E Curing"],
      [{ value: "Curing Line F", bold: true, size: 18 }, "Busduct Line F Curing"],
      [{ value: "906-C1-LV01 Non industri", bold: true, size: 18 }, "Locker Room", "highlight"],
      [{ value: "107-C1-LV01", bold: true, size: 18 }, "DB Indoor Test"],
      [{ value: "DB MCC Curing", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "AHU Curing"],
      [{ value: "104-C1-LV01", bold: true, size: 18 }, "PMCC/CB/2A AHU"],
      [{ value: "Lighting External 2", bold: true, size: 18 }, "Street Lighting Zone 1", "highlight"],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "Incomer Trafo # 2", group: "groupD", bold: true, size: 18, color: "FFc00000", fgColor: {argb: "FF99FFcc"} }],
      [{ value: "104-C2-LV01", bold: true, size: 18 }, "Double Power Curing Line A, B & C"],
      [{ value: "204-DG2-1", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "Boiler House"],
      [{ value: "907-C2-LV01", bold: true, size: 18 }, "Entrance A"],
      [{ value: "NEW SDP Pirelli Warehouse", bold: true, size: 18, fgColor: {argb: "FFFFFF00"} }],
      [{ value: "Dinamic Balance machine", bold: true, size: 18 }, "DBM & Wrapping"],
      [{ value: "103- Busduct BTU 1", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "TBM BTU 1"],
      [{ value: "103- Busduct BTU 2", bold: true, size: 18 }, "TBM BTU 2"],
      [{ value: "103- Busduct BTU 3", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "TBM BTU 3"],
      [{ value: "103- Busduct BTU 4", bold: true, size: 18 }, "TBM BTU 4"],
      [{ value: "103- Busduct BTU 5", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "TBM BTU 5"],
      [{ value: "103- Busduct BTU 6", bold: true, size: 18 }, "TBM BTU 6"],
      [{ value: "DB Mech # 2 Non industri", bold: true, size: 18 }, "lighting pju, parkiran,futsal rest area , ac entrance B", "highlight"],
      [{ value: "MCC 2 Main OFFice", bold: true, size: 18 }, "AC Main aoFFice", "highlight"],
      [{ value: "DB- 901-C2-LV01", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "Lighting & power distribution"],
      [{ value: "DB - GF 902-C2-LV02", bold: true, size: 18 }, "Lighting & Receptacle Factory OFFice"],
      [{ value: "DB- AHU Indoor Test", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "AC & Heater Indoortest"],
      [{ value: "ATS MV C", bold: true, size: 18 }, "UPS 120 KVA"],
      [{ value: "Bandina M/C", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "MV-U Utility", bold: true, size: 22 }],
      [{ value: "Incomer Trafo # 1", group: "groupE", bold: true, size: 18, color: "FFc00000", fgColor: {argb: "FF99FFcc"} }],
      [{ value: "202-U1-LV01", bold: true, size: 18 }, "Cooling Tower MCC"],
      [{ value: "U.DG1.1", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "Emergency MV U"],
      [{ value: "Water Cooled Chiller No. 1", bold: true, size: 18 }],
      [{ value: "Water Cooled Chiller No. 2", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }],
      [{ value: "Air Compressor No.3", bold: true, size: 18 }],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "Incomer Trafo # 2", group: "groupE", bold: true, size: 18, color: "FFc00000", fgColor: {argb: "FF99FFcc"} }],
      [{ value: "Air Compressor No.1", bold: true, size: 18 }],
      [{ value: "Air Compressor No.2", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }],
      [{ value: "Water Cooled Chiller No. 3", bold: true, size: 18 }],
      [{ value: "202-U2-LV01", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "Industrial Water Chiller MCC"],
      [{ value: "U2-LV01", bold: true, size: 18 }, "Lighting & Power Distribution"],
      [{ value: "WWTP ", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }, "WWTP area"],
      [{ value: "GUEST HOUSE - Non industri", bold: true, size: 18, fgColor: {argb: "FFFFFF00"} }],
      [{ value: "WTP PUMP", bold: true, size: 18, fgColor: {argb: "FF99FFcc"} }],
      [{ value: "ATS 2 MV U", bold: true, size: 18 }],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "Warehouse Pirelli (New SDP)", bold: true, size: 18, fgColor: {argb: "FF92d050"} }],
      [{ value: "Stand KWh", bold: true, size: 18 }],
      [{ value: "Stand kVARh", bold: true, size: 18 }],
      [{ value: " ", bold: true, size: 28 }],
      [{ value: "MCC/ TR/ 1", bold: true, size: 18, fgColor: {argb: "FFFFFF00"} }],
      [{ value: "MCC/ FR/ 1", bold: true, size: 18, fgColor: {argb: "FFFFFF00"} }],
    ];

  const labelToRowMap = {};
  let currentRow = 5;
  const descriptionStartRow = 5;

  const colorMap = {
    "FFEEECE1": [6,8,10,12,14,16,19,21,23,25,29,32],
    "FFFFFF00": [11,27,28,30,46,47,70,71,75,79,85,93,94,116,124,125],
    "FFC5D9F1": [36,38,40,42,44,48,51,53,55,57,59,61,63],
    "FF99FFCC": [66,68,73,77,81,83,87,89,91,95,97,99,102,104,106,109,111,113,115,117]
  };

  const meterOptions = {
  groupA: ["Incoming Main"],
  groupB: ["Incomer Trafo # 1", "101-11-02", "101-11-11", "101-06-01", "108-A1-LV01", "101-A2-LV01-2", "MCC MV - A", "101-06-02", "101-11-15", "101-11-01", "101-11-06", "101-A1-LV01", "Incomer Trafo # 2", "101-21-23", "101-21-02", "101-21-03", "101-21-04", "101-06-04", "A-DG1-1-1", "DB A2-LV01-1", "101.A2-LV01-1 - Non Industrial", "NEW RAW MATERIAL WAREHOUSE EXPAND", "DB A2-LV01-2", "101.A2-LV01-4  ELV 7", "101-21-18", "101-21-01", "A1-LV01"],
  groupC: ["Incomer # 1", "102-07-01", "102-07-02", "102-07-03", "102-07-04", "102-09-01", "102-10-01", "102-13-01", "DB- SF/1", "B-DG1-1-1", "MCC # 6 non industri", "MCC # 5 non industri", "B2 LV01", "B2 LV02", "Incomer # 2", "102-04-01", "102-05-01", "SPARE", "102-01-01", "102-01-03", "102-01-04", "102-01-05", "DB MCC #3", "Incomer # 3", "102-02-01"],
  groupD: ["Incomer Trafo # 1", "C1 LV01", "104-C1-LV04", "MCC Vaccum pump", "DB Mech # 3 non industri", "DB Mech # 3 non industri - Musholla", "Curing Line D", "Curing Line E", "Curing Line F", "906-C1-LV01 Non industri", "107-C1-LV01", "DB MCC Curing", "104-C1-LV01", "Lighting External 2", "Incomer Trafo 2", "104-C2-LV01", "204-DG2-1", "907-C2-LV01", "NEW SDP Pirelli Warehouse", "Dinamic Balance machine", "103- Busduct BTU 1", "103- Busduct BTU 2", "103- Busduct BTU 3", "103- Busduct STU 4", "103- Busduct STU 5", "103- Busduct STU 6", "DB Mech # 2 Non industri", "MCC 2 Main OFFice", "DB- 901-C2-LV01", "DB - GF 902-C2-LV02", "DB- AHU Indoor Test", "ATS MV C", "Bandina M/C"],
  groupE: ["Incomer Trafo # 1", "202-U1-LV01", "U.DG1.1", "Water Cooled Chiller No. 1", "Water Cooled Chiller No. 2", "Air Compressor No.3", "Incomer Trafo # 2", "Compressor No.1", "Air Compressor No.2", "Water Cooled Chiller No. 3", "202-U2-LV01", "U2-LV01", "WWTP", "GUEST HOUSE Non industri", "WTP PUMP", "ATS 2 MV U"]
}

  const meterDetailToGroup = Object.entries(meterOptions).reduce((map, [group, list]) => {
  list.forEach(label => {
    map[label] = group;
  });
  return map;
}, {});


  for (const row of rows) {
    const excelRow = worksheetLV.getRow(currentRow);
    if (typeof row[0] === "string") {
      excelRow.getCell(1).value = row[0];
      currentRow++;
      continue;
    }

    const value = row[0].value;
    const groupKey = row[0].group || Object.entries(meterOptions).find(([key, list]) => list.includes(value))?.[0] || "";
    const fullKey = `${groupKey}|${value}`;
    labelToRowMap[fullKey] = currentRow;
    const bold = row[0].bold ?? false;
    const size = row[0].size ?? 12;
    const color = row[0].color;
    const fgColor = row[0].fgColor;
    const subText = row[1] ?? "";
    const isHighlighted = row[2] === "highlight";

    const cell = excelRow.getCell(1);
    cell.alignment = { wrapText: true, vertical: "middle" };

    if (isHighlighted || fgColor) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: fgColor ?? { argb: "FFFFFF00" },
      };
    }

    if (subText) {
      cell.value = {
        richText: [
          { text: `${value}\n`, font: { name: "Cambria", bold, size, color: color ? { argb: color } : undefined } },
          { text: subText, font: { name: "Cambria", size: 10 } },
        ],
      };
    } else {
      cell.value = value;
      cell.font = { name: "Cambria", bold, size, color: color ? { argb: color } : undefined };
    }

    cell.border = titleCell.border;
    currentRow++;
  }

  // --- Remap labelToRowMap after writing all rows, with group info ---
  for (let row = descriptionStartRow; row <= worksheetLV.rowCount; row++) {
    const cell = worksheetLV.getCell(row, 1);
    let label = "";
    if (cell.value && typeof cell.value === "object" && cell.value.richText) {
      label = (cell.value.richText[0]?.text || "").split("\n")[0].trim();
    } else if (typeof cell.value === "string") {
      label = cell.value.trim();
    }
    if (label) {
      const groupKey = meterDetailToGroup[label] || "";
      labelToRowMap[`${groupKey}|${label}`] = row;
    }
  }

  // --- Load data from localStorage ---
  let dataList = [];
  try {
    dataList = JSON.parse(localStorage.getItem("energyDataLV")) || [];
  } catch (err) {
    console.error("Failed to load data from localStorage:", err);
  }

  const uniqueDates = [...new Set(dataList.map(item => item.timestamp))].sort();
  const shiftToOFFset = { "1": 0, "2": 1, "3": 2 };

  // --- Write date and shift headers ---
  uniqueDates.forEach((date, dateIndex) => {
    const startCol = 2 + dateIndex * 3;
    const endCol = startCol + 2;

    worksheetLV.mergeCells(2, startCol, 2, endCol);
    const dateCell = worksheetLV.getCell(2, startCol);
    dateCell.value = date;
    dateCell.font = { size: 12, bold: true };
    dateCell.alignment = { horizontal: "center", vertical: "middle" };
    dateCell.fill = dateLabel.fill;
    dateCell.border = titleCell.border;

    ["1", "2", "3"].forEach((shift, i) => {
      const shiftCell = worksheetLV.getCell(3, startCol + i);
      shiftCell.value = `Shift ${shift}`;
      shiftCell.font = { bold: true, size: 12 };
      shiftCell.alignment = { horizontal: "center", vertical: "middle" };
      shiftCell.fill = checkCell.fill;
      shiftCell.border = titleCell.border;
    });
  });

  const totalCol = 2 + uniqueDates.length * 3;
  const filledCells = new Set();
  const excludedLabels = ["", "MV-A Mixing", "MV-B Semi Finishing", "MV-C Curing & Fin.Product", "MV-U Utility", "Warehouse Pirelli (New SDP)"];

  // --- Write data values based on combined group|label key ---
  console.log("labelToRowMap keys:", Object.keys(labelToRowMap));
  console.log("Data entry keys to check:");
  dataList.forEach(entry => {
    const groupKey = entry.meterGroup;
    const label = (entry.meterDetail || "").trim();
    const key = `${groupKey}|${label}`;

    const rowIndex = labelToRowMap[key];
    if (!rowIndex) return;

    const dateIndex = uniqueDates.indexOf(entry.timestamp);
    if (dateIndex === -1) return;

    const shiftOFFset = shiftToOFFset[entry.shift];
    if (shiftOFFset === undefined) return;

    const targetCol = 2 + dateIndex * 3 + shiftOFFset;
    
    console.log(`Writing value at row ${rowIndex}, col ${targetCol}, key: ${key}, value: ${entry.kWh}`);

    const cell = worksheetLV.getCell(rowIndex, targetCol);
    cell.value = parseFloat(entry.kWh) || 0;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.font = { size: 11, bold: true };

    for (const [argb, rows] of Object.entries(colorMap)) {
      if (rows.includes(rowIndex)) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
        break;
      }
    }

    cell.border = titleCell.border;
    filledCells.add(`${rowIndex}:${targetCol}`);
    console.log(key, "->", labelToRowMap[key]);
  });

  // --- Fill zeros for empty cells except excluded labels ---
  for (let row = 5; row <= worksheetLV.rowCount; row++) {
    const labelCell = worksheetLV.getCell(row, 1);
    let label = "";
    if (labelCell.value && typeof labelCell.value === "object" && labelCell.value.richText) {
      label = (labelCell.value.richText[0]?.text || "").split("\n")[0].trim();
    } else if (typeof labelCell.value === "string") {
      label = labelCell.value.trim();
    }
    if (excludedLabels.includes(label)) continue;

    for (let col = 2; col < totalCol; col++) {
      const key = `${row}:${col}`;
      if (!filledCells.has(key)) {
        const cell = worksheetLV.getCell(row, col);
        cell.value = 0;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { size: 11, bold: true, color: {argb: "FFFF0000"} };

        for (const [argb, rows] of Object.entries(colorMap)) {
          if (rows.includes(row)) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
            break;
          }
        }

        cell.border = titleCell.border;
      }
    }
  }

  worksheetLV.columns = Array.from({ length: totalCol }, (_, i) => ({
    width: i === 0 ? 50 : 15,
  }));
};

export default ReadLVSheet;
