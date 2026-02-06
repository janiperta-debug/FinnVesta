import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PTSPlanResponse } from 'types';

/**
 * Export PTS investment plan to PDF file
 */
export function exportPTSToPDF(ptsPlan: PTSPlanResponse): void {
  const doc = new jsPDF();
  
  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  // Page 1: Title and Overview
  doc.setFontSize(20);
  doc.text('Investointisuunnitelma (PTS)', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Suunnittelujakso: ${ptsPlan.start_year}\u2013${ptsPlan.end_year}`, 14, 30);
  
  doc.setFontSize(10);
  const today = new Date();
  const dateStr = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;
  doc.text(`Luotu: ${dateStr}`, 14, 36);

  // Overview metrics table
  autoTable(doc, {
    startY: 45,
    head: [['Mittari', 'Arvo']],
    body: [
      ['Kokonaisinvestointi', formatCurrency(ptsPlan.total_investment)],
      ['Keskimääräinen vuositaso', formatCurrency(ptsPlan.average_annual_investment)],
      ['Rakennuksia yhteensä', ptsPlan.total_buildings.toString()],
      ['Peruskorjauksia', ptsPlan.buildings_needing_renovation.toString()],
      ['Suunnittelujakso', `${ptsPlan.parameters.planning_horizon_years} vuotta`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  // Parameters table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Parametri', 'Arvo']],
    body: [
      ['Peruskorjauksen raja-arvo', formatPercentage(ptsPlan.parameters.trigger_threshold)],
      ['Tavoitekunto peruskorjauksen jälkeen', formatPercentage(ptsPlan.parameters.target_percentage)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  // Page 2: Annual Summary
  doc.addPage();
  doc.setFontSize(16);
  doc.text('Vuosittainen yhteenveto', 14, 20);

  const annualTableData = ptsPlan.annual_summary.map(item => [
    item.year.toString(),
    formatCurrency(item.total_investment),
    item.buildings_count.toString(),
    formatCurrency(item.cumulative_investment)
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Vuosi', 'Investointi', 'Rakennukset', 'Kumulatiivinen']],
    body: annualTableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  // Page 3+: Building Schedule
  doc.addPage();
  doc.setFontSize(16);
  doc.text('Peruskorjausohjelma', 14, 20);

  const scheduleTableData: any[] = [];
  
  Object.entries(ptsPlan.yearly_schedule)
    .filter(([_, investments]) => investments.length > 0)
    .forEach(([year, investments]) => {
      investments.forEach(inv => {
        const conditionBefore = inv.condition_before !== null && inv.condition_before !== undefined
          ? formatPercentage(inv.condition_before)
          : '—';
        const conditionAfter = inv.condition_after !== null && inv.condition_after !== undefined
          ? formatPercentage(inv.condition_after)
          : '—';
        const notes = inv.is_split_project && inv.split_year_index
          ? `Monivuotinen (${inv.split_year_index})`
          : '';
        
        scheduleTableData.push([
          year,
          inv.building_name,
          formatCurrency(inv.investment_amount),
          conditionBefore,
          conditionAfter,
          notes
        ]);
      });
    });

  autoTable(doc, {
    startY: 30,
    head: [['Vuosi', 'Rakennus', 'Investointi', 'Kunto ennen', 'Kunto jälkeen', 'Huomiot']],
    body: scheduleTableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'center' }
    },
    styles: {
      fontSize: 9,
      cellPadding: 2
    }
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `FinnVesta - Investointisuunnitelma | Sivu ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Generate filename
  const filename = `PTS_Investointisuunnitelma_${ptsPlan.start_year}-${ptsPlan.end_year}_${dateStr.replace(/\./g, '-')}.pdf`;
  
  // Save PDF
  doc.save(filename);
}
