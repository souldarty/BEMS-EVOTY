import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import ReadLVSheet from "@/components/Excel/ReadLVSheet"
import ReadDailyMV from "@/components/Excel/ReadDailyMV"
import DiffMV from "@/components/Excel/DiffMV"
import TotalMonthlyMV from "@/components/Excel/TotalMonthlyMV"
import ReadingMV from "@/components/Excel/ReadingMV"
import { ArrowDownToLine } from 'lucide-react'

const ExportExcelTemplate = () => {
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const dataList = JSON.parse(localStorage.getItem("energyDataMV") || "[]");

    const uniqueDates = ReadDailyMV(workbook, dataList);      // buat Reading MV
    const firstDate = uniqueDates[0]; // Tanggal awal dari ReadDailyMV
    ReadingMV(workbook, firstDate);
    TotalMonthlyMV(workbook, uniqueDates);
    DiffMV(workbook, uniqueDates);                            // buat Diff MV, rumusnya valid karena sheet2 sudah ada
    ReadLVSheet(workbook);                                    // buat sheet lain

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "ReadingElectricEnergy.xlsx");
  };

  return (
    <button
      onClick={handleExport}
      className="bg-green-600 text-white px-2 py-1 rounded shadow"
    >
      <ArrowDownToLine/>
    </button>
  );
};

export default ExportExcelTemplate;
