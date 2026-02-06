import * as XLSX from 'xlsx';
import type { PTSPlanResponse } from 'types';

/**
 * Export PTS investment plan to Excel file
 */
export function exportPTSToExcel(ptsPlan: PTSPlanResponse): void {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Overview
  const overviewData = [
    ['Investointisuunnitelma (PTS)', ''],
    ['', ''],
    ['Suunnittelujakso', `${ptsPlan.start_year}–${ptsPlan.end_year}`],
    ['Vuosia', `${ptsPlan.parameters.planning_horizon_years}`],
    ['', ''],
    ['Kokonaisinvestointi', ptsPlan.total_investment],
    ['Keskimääräinen vuositaso', ptsPlan.average_annual_investment],
    ['', ''],
    ['Rakennuksia yhteensä', ptsPlan.total_buildings],
    ['Peruskorjauksia', ptsPlan.buildings_needing_renovation],
    ['', ''],
    ['Parametrit', ''],
    ['Raja-arvo', `${(ptsPlan.parameters.trigger_threshold * 100).toFixed(0)}%`],
    ['Tavoitekunto', `${(ptsPlan.parameters.target_percentage * 100).toFixed(0)}%`],
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Yhteenveto');

  // Sheet 2: Annual Summary
  const annualData = [
    ['Vuosi', 'Investointi (€)', 'Rakennukset (kpl)', 'Kumulatiivinen (€)']
  ];
  
  ptsPlan.annual_summary.forEach(item => {
    annualData.push([
      item.year,
      item.total_investment,
      item.buildings_count,
      item.cumulative_investment
    ]);
  });
  
  const annualSheet = XLSX.utils.aoa_to_sheet(annualData);
  XLSX.utils.book_append_sheet(workbook, annualSheet, 'Vuosittainen yhteenveto');

  // Sheet 3: Building Schedule
  const scheduleData = [
    ['Vuosi', 'Rakennus', 'Investointi (€)', 'Kunto ennen', 'Kunto jälkeen', 'Huomiot']
  ];
  
  Object.entries(ptsPlan.yearly_schedule)
    .filter(([_, investments]) => investments.length > 0)
    .forEach(([year, investments]) => {
      investments.forEach(inv => {
        const conditionBefore = inv.condition_before !== null && inv.condition_before !== undefined
          ? `${(inv.condition_before * 100).toFixed(0)}%`
          : '';
        const conditionAfter = inv.condition_after !== null && inv.condition_after !== undefined
          ? `${(inv.condition_after * 100).toFixed(0)}%`
          : '';
        const notes = inv.is_split_project && inv.split_year_index
          ? `Monivuotinen projekti (${inv.split_year_index})`
          : '';
        
        scheduleData.push([
          parseInt(year),
          inv.building_name,
          inv.investment_amount,
          conditionBefore,
          conditionAfter,
          notes
        ]);
      });
    });
  
  const scheduleSheet = XLSX.utils.aoa_to_sheet(scheduleData);
  XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Peruskorjausohjelma');

  // Generate filename with current date
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const filename = `PTS_Investointisuunnitelma_${ptsPlan.start_year}-${ptsPlan.end_year}_${dateStr}.xlsx`;

  // Write to file
  XLSX.writeFile(workbook, filename);
}
