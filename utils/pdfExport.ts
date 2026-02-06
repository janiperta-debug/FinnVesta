import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format currency for PDF display
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (!value && value !== 0) return '–';
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format date for PDF display
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '–';
  return new Date(date).toLocaleDateString('fi-FI');
};

/**
 * Add header to PDF
 */
export const addPDFHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 20, 20);
  
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, 20, 28);
  }
  
  // Date
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Luotu: ${formatDate(new Date())}`, 20, subtitle ? 35 : 28);
  
  // Line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, subtitle ? 40 : 33, 190, subtitle ? 40 : 33);
};

/**
 * Add footer to PDF with page numbers
 */
export const addPDFFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Sivu ${i} / ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
};

/**
 * Add a section header to PDF
 */
export const addSectionHeader = (doc: jsPDF, title: string, y: number): number => {
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 20, y);
  return y + 8;
};

/**
 * Add a key-value pair to PDF
 */
export const addKeyValue = (
  doc: jsPDF,
  key: string,
  value: string,
  x: number,
  y: number,
  keyWidth = 60
): number => {
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(key, x, y);
  doc.setTextColor(40, 40, 40);
  doc.text(value, x + keyWidth, y);
  return y + 6;
};

/**
 * Create a metrics box in PDF
 */
export const addMetricsBox = (
  doc: jsPDF,
  metrics: Array<{ label: string; value: string }>,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  // Draw box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(250, 250, 250);
  doc.rect(x, y, width, height, 'FD');
  
  // Add metrics
  let currentY = y + 8;
  metrics.forEach(metric => {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(metric.label, x + 5, currentY);
    
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(metric.value, x + 5, currentY + 6);
    
    currentY += 14;
  });
};
