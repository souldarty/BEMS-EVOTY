import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const TemplateMonthly = () => {
  const generateExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Total Consumption KPI');

    // Set column widths
    sheet.columns = [
      { header: '', key: 'col1', width: 30 },
      { header: 'Reading', key: 'col2', width: 15 },
      { header: 'Date', key: 'col3', width: 15 },
      { header: 'LWBP', key: 'col4', width: 15 },
      { header: 'WBP', key: 'col5', width: 15 },
      { header: 'KVARH', key: 'col6', width: 15 },
      { header: '', key: 'col7', width: 15 },
      { header: '', key: 'col8', width: 15 },
    ];

    // TITLE merged
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Total Consumption Bulan March for KPI';
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { bold: true, size: 14 };

    // Section Header 1 (Green background)
    sheet.mergeCells('A2:F2');
    const sec1 = sheet.getCell('A2');
    sec1.value = 'Manual Reading APP PLN Jam.10:00 WIB(Invoice)';
    sec1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F7F4E' } };
    sec1.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Headers Row 3
    const headers = ['Reading', 'Date', 'LWBP', 'WBP', 'KVARH'];
    sheet.getRow(3).values = ['', ...headers];
    sheet.getRow(3).font = { bold: true };
    sheet.getRow(3).alignment = { horizontal: 'center' };

    // Example data for first section starting row 4
    const data1 = [
      ['Stand kWH Lalu', '1-Mar-2024', 1000, 2000, 300],
      ['Stand kWH Akhir', '1-Apr-2024', 1200, 2500, 350],
      ['Difference (Stnd Akhir - Stnd Lalu)', '', { formula: 'C5-C4' }, { formula: 'D5-D4' }, { formula: 'E5-E4' }],
      ['Consumption KWH (Diff*8)', '', { formula: 'C6*8' }, { formula: 'D6*8' }, { formula: 'E6*8' }],
      ['Total Consumption (LWBP1 + LWBP2 + WBP)', '', { formula: 'C7+D7+E7' }, '', ''],
      ['Energy expenses (IDR)', '', 0, 0, 'No Payment'],
      ['Total Energy expenses (LWBP1 + LWBP2 + WBP)', '', { formula: 'C8+D8+E8' }, '', ''],
    ];
    data1.forEach((row, idx) => {
      const r = 4 + idx;
      sheet.getRow(r).values = [row[0], row[1], row[2], row[3], row[4]];
    });

    // Style rows
    sheet.getRow(4).font = { bold: false };
    sheet.getRow(6).font = { bold: true, color: { argb: 'FF0000FF' } }; // blue font for Consumption KWH
    sheet.getRow(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // yellow bg for total consumption
    sheet.getRow(9).font = { italic: true };
    sheet.getRow(10).font = { bold: true, color: { argb: 'FFFF0000' } }; // red bold for total energy expenses

    // Section Header 2 (Green background) - Manual Reading PLN Jam.08:00 WIB(Daily)
    sheet.mergeCells('A12:F12');
    const sec2 = sheet.getCell('A12');
    sec2.value = 'Manual Reading PLN Jam.08:00 WIB(Daily)';
    sec2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8AB66B' } };
    sec2.font = { bold: true, color: { argb: 'FF000000' } };

    // ... You can continue building the rest of sections similarly ...

    // Pie chart example - ExcelJS currently does not support charts
    // So we can't generate pie charts directly, but you can export data and add chart manually in Excel

    // Generate and save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'TotalConsumptionKPI_March.xlsx');
  };

  return (
    <button onClick={generateExcel} style={{ padding: 10, fontSize: 16 }}>
      Export Total Consumption Excel
    </button>
  );
};

export default TemplateMonthly;
