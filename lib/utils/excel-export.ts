import * as XLSX from "xlsx";

interface ExcelExportOptions {
  columns: string[];
  data: (string | number)[][];
  filename: string;
}

export function exportToExcel({ columns, data, filename }: ExcelExportOptions) {
  // Tablo başlıkları ve verileri birleştir
  const worksheetData = [columns, ...data];
  
  // Yeni bir çalışma sayfası (worksheet) oluştur
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Yeni bir çalışma kitabı (workbook) oluştur
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Stok Raporu");
  
  // Sütun genişliklerini ayarla (opsiyonel ama okunabilirliği artırır)
  const colWidths = columns.map(() => ({ wch: 20 }));
  worksheet["!cols"] = colWidths;
  
  // Dosyayı indir
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
