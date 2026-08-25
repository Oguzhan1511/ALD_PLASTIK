import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Türkçe karakterleri standart İngilizce karakterlere çeviren yardımcı fonksiyon
// jsPDF'in varsayılan fontları (Helvetica vb.) Türkçe karakterleri (ş, ğ, ı vb.) desteklemez.
function normalizeTurkish(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U");
}

interface PdfExportOptions {
  title: string;
  columns: string[];
  data: (string | number)[][];
  filename: string;
}

export async function exportToPdf({ title, columns, data, filename }: PdfExportOptions) {
  // A4 formatında, dikey (portrait) bir PDF oluştur
  const doc = new jsPDF("p", "pt", "a4");

  // Logoyu yükle
  const logoUrl = "/ald-logo.png";
  const img = new Image();
  img.src = logoUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Logo yüklenemedi."));
  });

  // Logoyu PDF'e ekle (x: 40, y: 30, genişlik: 120, yükseklik oranı korunacak şekilde)
  const imgWidth = 120;
  const imgHeight = (img.height * imgWidth) / img.width;
  doc.addImage(img, "PNG", 40, 30, imgWidth, imgHeight);

  // Tarih bilgisi
  const today = new Date();
  const dateStr = today.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Tarih: ${dateStr}`, doc.internal.pageSize.width - 40, 50, { align: "right" });

  // Başlık
  doc.setFontSize(16);
  doc.setTextColor(40);
  // Başlığı da normalize ediyoruz ki sorun çıkmasın
  const normalizedTitle = normalizeTurkish(title);
  doc.text(normalizedTitle, 40, 40 + imgHeight + 20);

  // Verileri normalize et
  const normalizedColumns = columns.map(normalizeTurkish);
  const normalizedData = data.map((row) => row.map((cell) => normalizeTurkish(String(cell))));

  // Tabloyu çiz
  autoTable(doc, {
    startY: 40 + imgHeight + 40,
    head: [normalizedColumns],
    body: normalizedData,
    theme: "striped",
    headStyles: {
      fillColor: [41, 128, 185], // Mavi ton
      textColor: 255,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // PDF'i indir
  doc.save(normalizeTurkish(filename) + ".pdf");
}
