import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPDFHeader, addPDFFooter, addSectionHeader, formatCurrency } from './pdfExport';
import type { PortfolioDashboard, PortfolioFinancialOverview, BuildingSummary } from 'types';

/**
 * Executive Summary Report (1-2 pages)
 * Investor-friendly high-level overview
 */
export const generateExecutiveSummary = (
  dashboard: PortfolioDashboard,
  financials: PortfolioFinancialOverview
) => {
  const doc = new jsPDF();
  
  // Header with FinnVesta branding
  doc.setFillColor(41, 128, 185); // Professional blue
  doc.rect(0, 0, 210, 35, 'F');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('FinnVesta', 20, 15);
  doc.setFontSize(16);
  doc.text('Johdon yhteenveto', 20, 25);
  doc.setFontSize(9);
  doc.setTextColor(240, 240, 240);
  doc.text(`Luotu: ${new Date().toLocaleDateString('fi-FI')}`, 20, 31);
  
  let yPos = 45;
  
  // Key Portfolio Metrics
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Portfolio-yleiskatsaus', 20, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Mittari', 'Arvo']],
    body: [
      ['Rakennuksia yhteensä', `${dashboard.overview.total_buildings} kpl`],
      ['Kokonaispinta-ala', `${financials.total_area_m2.toLocaleString('fi-FI')} m²`],
      ['Keskimääräinen kunto', dashboard.overview.average_condition_pct ? `${dashboard.overview.average_condition_pct.toFixed(0)}%` : '–'],
      ['Markkina-arvo', formatCurrency(financials.total_market_value)],
      ['Jälleenhankinta-arvo (JHA)', formatCurrency(dashboard.overview.total_replacement_value)],
      ['Tekninen arvo (TeknA)', formatCurrency(dashboard.overview.total_technical_value)],
      ['Korjausvelka yhteensä', formatCurrency(dashboard.overview.total_repair_debt)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  // Financial Snapshot
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Taloudellinen yhteenveto', 20, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Pääoma', 'Arvo', 'Tunnusluku']],
    body: [
      ['Markkina-arvo', formatCurrency(financials.total_market_value), '100%'],
      ['Velka', formatCurrency(financials.total_debt), `${financials.debt_to_value_ratio?.toFixed(1) || '–'}%`],
      ['Oma pääoma', formatCurrency(financials.total_equity), `${(100 - (financials.debt_to_value_ratio || 0)).toFixed(1)}%`],
      ['Vuokratulot (vuosi)', formatCurrency(financials.total_rental_income), '–'],
      ['Käyttökustannukset', formatCurrency(financials.total_operating_costs), `${financials.operating_cost_per_m2?.toFixed(2) || '–'} €/m²`],
      ['Nettotulos (NOI)', formatCurrency(financials.total_noi), '–'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  // Condition Distribution
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Kuntoluokkajakauma', 20, yPos);
  yPos += 8;
  
  const totalBuildings = dashboard.overview.total_buildings;
  const criticalPct = totalBuildings > 0 ? (dashboard.overview.buildings_critical / totalBuildings * 100).toFixed(0) : '0';
  const adequatePct = totalBuildings > 0 ? (dashboard.overview.buildings_adequate / totalBuildings * 100).toFixed(0) : '0';
  const goodPct = totalBuildings > 0 ? (dashboard.overview.buildings_good / totalBuildings * 100).toFixed(0) : '0';
  
  autoTable(doc, {
    startY: yPos,
    head: [['Kunto', 'Rakennuksia', '% kokonaisuudesta']],
    body: [
      ['Kriittinen (<60%)', `${dashboard.overview.buildings_critical} kpl`, `${criticalPct}%`],
      ['Välttävä (60-75%)', `${dashboard.overview.buildings_adequate} kpl`, `${adequatePct}%`],
      ['Hyvä (>75%)', `${dashboard.overview.buildings_good} kpl`, `${goodPct}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 0) {
        if (data.row.index === 0) data.cell.styles.textColor = [220, 38, 38]; // Red
        if (data.row.index === 1) data.cell.styles.textColor = [234, 179, 8]; // Yellow
        if (data.row.index === 2) data.cell.styles.textColor = [22, 163, 74]; // Green
      }
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  // Top 5 Critical Buildings
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Kriittisimmät rakennukset (toimenpiteet tarvitaan)', 20, yPos);
  yPos += 8;
  
  const criticalBuildings = dashboard.buildings
    .filter(b => b.condition_score !== null && b.condition_score < 0.60)
    .sort((a, b) => (a.condition_score || 0) - (b.condition_score || 0))
    .slice(0, 5);
  
  if (criticalBuildings.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Rakennus', 'Ikä', 'Kunto', 'Korjausvelka']],
      body: criticalBuildings.map(b => [
        b.name,
        `${b.building_age} v`,
        b.condition_score ? `${(b.condition_score * 100).toFixed(0)}%` : '–',
        b.repair_debt ? formatCurrency(b.repair_debt) : '–',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      margin: { left: 20, right: 20 },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Ei kriittisiä rakennuksia', 20, yPos);
  }
  
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  // Investment Needs Summary
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Investointitarve yhteenveto', 20, yPos);
  yPos += 8;
  
  const repairDebtRatio = financials.repair_debt_to_market_value || 0;
  const repairDebtStatus = repairDebtRatio > 20 ? 'KORKEA - Vaatii välitöntä huomiota' :
                           repairDebtRatio > 10 ? 'KOHTALAINEN - Seuranta suositeltavaa' :
                           'HALLINNASSA';
  
  autoTable(doc, {
    startY: yPos,
    head: [['Mittari', 'Arvo', 'Status']],
    body: [
      ['Korjausvelka yhteensä', formatCurrency(dashboard.overview.total_repair_debt), '–'],
      ['Korjausvelka / Markkina-arvo', `${repairDebtRatio.toFixed(1)}%`, repairDebtStatus],
      ['Rakennuksia tarkistettavana', `${dashboard.overview.buildings_needing_assessment} kpl`, '–'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 2 && data.row.index === 1) {
        if (repairDebtRatio > 20) data.cell.styles.textColor = [220, 38, 38];
        else if (repairDebtRatio > 10) data.cell.styles.textColor = [234, 179, 8];
        else data.cell.styles.textColor = [22, 163, 74];
      }
    },
  });
  
  // Footer with disclaimer
  yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const disclaimer = 'Tämä raportti on luotu FinnVesta-järjestelmällä ja perustuu viimeisimpään saatavilla olevaan dataan. '
    + 'Toisin kuin perinteiset konsulttiraportit, tämä raportti heijastaa aina portfolio-tilannetta reaaliajassa.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, 170);
  doc.text(disclaimerLines, 20, yPos);
  
  // Page numbers
  addPDFFooter(doc);
  
  // Save
  doc.save(`FinnVesta-Executive-Summary-${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Comprehensive Report (10-20+ pages)
 * Full technical detail for deep analysis
 */
export const generateComprehensiveReport = async (
  dashboard: PortfolioDashboard,
  financials: PortfolioFinancialOverview
) => {
  const doc = new jsPDF();
  
  // Cover page
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text('FinnVesta', 105, 100, { align: 'center' });
  doc.setFontSize(24);
  doc.text('Kattava Portfolio-raportti', 105, 120, { align: 'center' });
  doc.setFontSize(14);
  doc.text('Tekninen ja taloudellinen analyysi', 105, 135, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Luotu: ${new Date().toLocaleDateString('fi-FI')}`, 105, 250, { align: 'center' });
  doc.text(`${dashboard.overview.total_buildings} rakennusta | ${financials.total_area_m2.toLocaleString('fi-FI')} m²`, 105, 260, { align: 'center' });
  
  // Page 2: Executive Summary
  doc.addPage();
  let yPos = 20;
  
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Yhteenveto', 20, yPos);
  yPos += 12;
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const summaryText = `Tämä raportti kattaa ${dashboard.overview.total_buildings} rakennuksen portfolio-tilannteen `
    + `kokonaispinta-alaltaan ${financials.total_area_m2.toLocaleString('fi-FI')} m². `
    + `Portfolio markkina-arvo on ${formatCurrency(financials.total_market_value)} `
    + `ja keskimääräinen kuntoluokka ${dashboard.overview.average_condition_pct?.toFixed(0) || '–'}%.`;
  const summaryLines = doc.splitTextToSize(summaryText, 170);
  doc.text(summaryLines, 20, yPos);
  yPos += summaryLines.length * 5 + 10;
  
  // Key metrics grid
  autoTable(doc, {
    startY: yPos,
    head: [['Pääkategoria', 'Arvo']],
    body: [
      ['Markkina-arvo', formatCurrency(financials.total_market_value)],
      ['JHA (Jälleenhankinta-arvo)', formatCurrency(dashboard.overview.total_replacement_value)],
      ['TeknA (Tekninen arvo)', formatCurrency(dashboard.overview.total_technical_value)],
      ['Korjausvelka', formatCurrency(dashboard.overview.total_repair_debt)],
      ['Velka yhteensä', formatCurrency(financials.total_debt)],
      ['Oma pääoma', formatCurrency(financials.total_equity)],
      ['Vuokratulot (vuosi)', formatCurrency(financials.total_rental_income)],
      ['Nettotulos (NOI)', formatCurrency(financials.total_noi)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Page 3: Condition Analysis
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Kuntoluokka-analyysi', 20, yPos);
  yPos += 10;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Kuntoluokka', 'Rakennuksia', '% kokonaisuudesta', 'Status']],
    body: [
      [
        'Kriittinen (<60%)',
        `${dashboard.overview.buildings_critical} kpl`,
        `${dashboard.overview.total_buildings > 0 ? (dashboard.overview.buildings_critical / dashboard.overview.total_buildings * 100).toFixed(1) : 0}%`,
        'Vaatii välittömiä toimenpiteitä'
      ],
      [
        'Välttävä (60-75%)',
        `${dashboard.overview.buildings_adequate} kpl`,
        `${dashboard.overview.total_buildings > 0 ? (dashboard.overview.buildings_adequate / dashboard.overview.total_buildings * 100).toFixed(1) : 0}%`,
        'Seuranta ja suunnittelu'
      ],
      [
        'Hyvä (>75%)',
        `${dashboard.overview.buildings_good} kpl`,
        `${dashboard.overview.total_buildings > 0 ? (dashboard.overview.buildings_good / dashboard.overview.total_buildings * 100).toFixed(1) : 0}%`,
        'Ylläpito riittävää'
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Page 4: Full Building List
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Rakennuslista', 20, yPos);
  yPos += 10;
  
  const buildingData = dashboard.buildings.map(b => [
    b.name,
    `${b.building_age} v`,
    `${b.area_m2.toLocaleString('fi-FI')} m²`,
    b.condition_score ? `${(b.condition_score * 100).toFixed(0)}%` : '–',
    b.repair_debt ? formatCurrency(b.repair_debt) : '–',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Rakennus', 'Ikä', 'Pinta-ala', 'Kunto', 'Korjausvelka']],
    body: buildingData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8 },
    didParseCell: (data: any) => {
      // Color code condition scores
      if (data.section === 'body' && data.column.index === 3) {
        const building = dashboard.buildings[data.row.index];
        if (building.condition_score !== null) {
          if (building.condition_score < 0.60) {
            data.cell.styles.textColor = [220, 38, 38]; // Red
          } else if (building.condition_score < 0.75) {
            data.cell.styles.textColor = [234, 179, 8]; // Yellow
          } else {
            data.cell.styles.textColor = [22, 163, 74]; // Green
          }
        }
      }
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Page 5+: Financial Details
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Taloudelliset tiedot', 20, yPos);
  yPos += 10;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Kategoria', 'Summa', 'Per m²']],
    body: [
      ['Markkina-arvo', formatCurrency(financials.total_market_value), formatCurrency(financials.total_market_value / financials.total_area_m2)],
      ['Velka', formatCurrency(financials.total_debt), formatCurrency(financials.total_debt / financials.total_area_m2)],
      ['Oma pääoma', formatCurrency(financials.total_equity), formatCurrency(financials.total_equity / financials.total_area_m2)],
      ['Vuokratulot (vuosi)', formatCurrency(financials.total_rental_income), formatCurrency(financials.total_rental_income / financials.total_area_m2)],
      ['Käyttökustannukset', formatCurrency(financials.total_operating_costs), formatCurrency(financials.operating_cost_per_m2 || 0)],
      ['Nettotulos (NOI)', formatCurrency(financials.total_noi), formatCurrency(financials.total_noi / financials.total_area_m2)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Tunnusluku', 'Arvo', 'Arviointi']],
    body: [
      [
        'Velkaantumisaste (LTV)',
        `${financials.debt_to_value_ratio?.toFixed(1) || '–'}%`,
        (financials.debt_to_value_ratio || 0) > 70 ? 'Korkea' : (financials.debt_to_value_ratio || 0) > 50 ? 'Kohtuullinen' : 'Matala'
      ],
      [
        'Korjausvelka / Markkina-arvo',
        `${financials.repair_debt_to_market_value?.toFixed(1) || '–'}%`,
        (financials.repair_debt_to_market_value || 0) > 20 ? 'Korkea' : (financials.repair_debt_to_market_value || 0) > 10 ? 'Kohtalainen' : 'Hallinnassa'
      ],
      [
        'Käyttökustannus per m²',
        `${financials.operating_cost_per_m2?.toFixed(2) || '–'} €/m²`,
        '–'
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  
  // Size distribution
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Portfolio-kokoluokittelu', 20, yPos);
  yPos += 10;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Kokoluokka', 'Rakennuksia', '% kokonaisuudesta']],
    body: [
      [
        'Pienet (<1000 m²)',
        `${financials.small_buildings_count} kpl`,
        `${dashboard.overview.total_buildings > 0 ? (financials.small_buildings_count / dashboard.overview.total_buildings * 100).toFixed(1) : 0}%`
      ],
      [
        'Keskikokoiset (1000-5000 m²)',
        `${financials.medium_buildings_count} kpl`,
        `${dashboard.overview.total_buildings > 0 ? (financials.medium_buildings_count / dashboard.overview.total_buildings * 100).toFixed(1) : 0}%`
      ],
      [
        'Suuret (>5000 m²)',
        `${financials.large_buildings_count} kpl`,
        `${dashboard.overview.total_buildings > 0 ? (financials.large_buildings_count / dashboard.overview.total_buildings * 100).toFixed(1) : 0}%`
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  
  // Final page: Methodology and Disclaimer
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Laskentamenetelmät ja huomautukset', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const methodology = [
    'KUNTOLUOKITUS:',
    '• Kriittinen: <60% - Rakennus vaatii välittömiä peruskorjaustoimenpiteitä',
    '• Välttävä: 60-75% - Peruskorjaus tulee ajankohtaiseksi lähivuosina',
    '• Hyvä: >75% - Rakennus kunnossa, ylläpito riittävää',
    '',
    'TALOUDELLISET TUNNUSLUVUT:',
    '• JHA (Jälleenhankinta-arvo): Rakennuksen uudelleenrakentamiskustannus',
    '• TeknA (Tekninen arvo): JHA vähennettynä kulumalla ja ikääntymisellä',
    '• Korjausvelka: Erotus JHA:n ja TeknA:n välillä',
    '• LTV (Loan-to-Value): Velka / Markkina-arvo',
    '• NOI (Net Operating Income): Vuokratulot - Käyttökustannukset',
    '',
    'TIETOJEN AJANTASAISUUS:',
    `Tämä raportti on luotu ${new Date().toLocaleDateString('fi-FI')} ja perustuu viimeisimpään saatavilla olevaan dataan. `,
    'FinnVesta tarjoaa jatkuvasti päivittyvää dataa, joten toisin kuin perinteiset konsulttiraportit, ',
    'tämä raportti heijastaa aina portfolio-tilannetta reaaliajassa.',
  ];
  
  methodology.forEach(line => {
    if (line.startsWith('•')) {
      doc.setFontSize(9);
      doc.text(line, 25, yPos);
      yPos += 5;
    } else if (line === '') {
      yPos += 3;
    } else {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(line, 20, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 7;
    }
  });
  
  // Page numbers
  addPDFFooter(doc);
  
  // Save
  doc.save(`FinnVesta-Comprehensive-Report-${new Date().toISOString().split('T')[0]}.pdf`);
};
