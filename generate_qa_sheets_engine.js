const ExcelJS = require('exceljs');

/**
 * Generates a professional 2-sheet QA Excel workbook using ExcelJS (Node.js):
 *  - Sheet 1: App Test Cases
 *  - Sheet 2: Web Admin Test Cases
 * Both sheets use identical 10-column formats with dropdowns, styling, and Jira tracking.
 *
 * @param {Object} options
 * @param {string} options.fileName - Target .xlsx output path
 * @param {string} options.projectTitle - Name of the project (e.g., "Bug Tracking System")
 * @param {Array} options.appModulesData - Array of modules and test cases for Mobile/Client App
 * @param {Array} options.adminModulesData - Array of modules and test cases for Web Admin Portal
 */
async function generateQAWorkbook({
  fileName,
  projectTitle,
  appModulesData = [],
  adminModulesData = []
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'QA Automation Lead';
  wb.lastModifiedBy = 'QA Automation Lead';
  wb.created = new Date();
  wb.modified = new Date();

  // ─── COLOR PALETTE (ARGB) ──────────────────────────────────────────────────
  const colors = {
    navyBanner: 'FF1E293B',
    white: 'FFFFFFFF',
    infoSubtext: 'FFE2E8F0',
    appHeader: 'FF2563EB',    // Royal Blue
    adminHeader: 'FF0D9488',  // Emerald Teal
    appSep: 'FFEEF2FF',       // Soft Indigo
    adminSep: 'FFF0FDFA',     // Soft Mint
    appModText: 'FF1E3A8A',
    adminModText: 'FF115E59',
    zebraEven: 'FFF8FAFC',    // Slate 50
    textSlate: 'FF0F172A',
    borderLight: 'FFCBD5E1'
  };

  // ─── BORDER DEFINITIONS ────────────────────────────────────────────────────
  const thinBorderSide = { style: 'thin', color: { argb: colors.borderLight } };
  const cellBorder = {
    top: thinBorderSide,
    left: thinBorderSide,
    bottom: thinBorderSide,
    right: thinBorderSide
  };

  const appBottomBorder = {
    ...cellBorder,
    bottom: { style: 'medium', color: { argb: colors.appModText } }
  };

  const adminBottomBorder = {
    ...cellBorder,
    bottom: { style: 'medium', color: { argb: colors.adminModText } }
  };

  // ─── COLUMN WIDTHS ─────────────────────────────────────────────────────────
  const colWidths = [
    { col: 1, width: 22 }, // Module Name
    { col: 2, width: 20 }, // Feature / Screen
    { col: 3, width: 14 }, // Test ID
    { col: 4, width: 32 }, // What to Test
    { col: 5, width: 44 }, // How to Test
    { col: 6, width: 38 }, // Expected Result
    { col: 7, width: 18 }, // Issue Found?
    { col: 8, width: 35 }, // Tester Notes
    { col: 9, width: 18 }, // Jira Ticket ID
    { col: 10, width: 20 } // Device / Browser
  ];

  const headersCommon = [
    'Module Name',
    'Feature / Screen',
    'Test ID',
    'What to Test (Simple Title)',
    'How to Test (Step-by-Step for Tester)',
    'Expected Result (What should happen)',
    'Issue Found? (Yes / No)',
    'Tester Notes / Remarks',
    'Jira Ticket ID'
  ];

  function buildSheet({
    sheetTitle,
    bannerText,
    subBanner,
    headerColor,
    sepColor,
    modTextColor,
    bottomBorder,
    platformColName,
    modulesData
  }) {
    const ws = wb.addWorksheet(sheetTitle, {
      views: [
        {
          state: 'frozen',
          xSplit: 3,
          ySplit: 3,
          topLeftCell: 'D4',
          activeCell: 'D4',
          showGridLines: true
        }
      ]
    });

    // Set Column Widths
    colWidths.forEach(({ col, width }) => {
      ws.getColumn(col).width = width;
    });

    // ─── ROW 1: Banner Title ─────────────────────────────────────────────────
    ws.mergeCells('A1:J1');
    const cellA1 = ws.getCell('A1');
    cellA1.value = bannerText;
    cellA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: colors.white } };
    cellA1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.navyBanner } };
    cellA1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getRow(1).height = 32;

    // ─── ROW 2: Sub-Banner Instructions ──────────────────────────────────────
    ws.mergeCells('A2:J2');
    const cellA2 = ws.getCell('A2');
    cellA2.value = subBanner;
    cellA2.font = { name: 'Calibri', size: 10, color: { argb: colors.infoSubtext } };
    cellA2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.navyBanner } };
    cellA2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getRow(2).height = 24;

    // ─── ROW 3: Column Headers ───────────────────────────────────────────────
    const headers = [...headersCommon, platformColName];
    const headerRow = ws.getRow(3);
    headerRow.height = 28;

    headers.forEach((hdr, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = hdr;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colors.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = cellBorder;
    });

    let currentRow = 4;

    // ─── MODULES & TEST CASES ────────────────────────────────────────────────
    modulesData.forEach(module => {
      const modName = module.module;
      const cases = module.cases || [];

      // Module Divider Bar
      ws.mergeCells(`A${currentRow}:J${currentRow}`);
      const sepCell = ws.getCell(`A${currentRow}`);
      sepCell.value = `📦 ${modName.toUpperCase()} (${cases.length} Test Cases)`;
      sepCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: modTextColor } };
      sepCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      ws.getRow(currentRow).height = 24;

      for (let c = 1; c <= 10; c++) {
        const cell = ws.getCell(currentRow, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sepColor } };
        cell.border = bottomBorder;
      }
      currentRow++;

      // Test Cases
      cases.forEach(tc => {
        const row = ws.getRow(currentRow);
        row.height = 42;
        const isEven = currentRow % 2 === 0;
        const rowFill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? colors.zebraEven : colors.white }
        };

        row.getCell(1).value = modName;
        row.getCell(2).value = tc.screen;
        row.getCell(3).value = tc.id;
        row.getCell(4).value = tc.title;
        row.getCell(5).value = tc.steps;
        row.getCell(6).value = tc.expected;

        // Status Dropdown
        const statusCell = row.getCell(7);
        statusCell.value = 'Not Tested';
        statusCell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"No (Pass),Yes (Fail),Blocked,Not Tested"']
        };

        row.getCell(8).value = '';
        row.getCell(9).value = '';
        row.getCell(10).value = '';

        for (let c = 1; c <= 10; c++) {
          const cell = row.getCell(c);
          cell.fill = rowFill;
          cell.border = cellBorder;
          cell.font = {
            name: 'Calibri',
            size: 10,
            bold: c === 3,
            color: { argb: colors.textSlate }
          };

          const isCentered = [3, 7, 9, 10].includes(c);
          cell.alignment = {
            horizontal: isCentered ? 'center' : 'left',
            vertical: 'middle',
            wrapText: true
          };
        }

        currentRow++;
      });
    });

    // Auto-Filter
    if (currentRow > 4) {
      ws.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: currentRow - 1, column: 10 }
      };
    }
  }

  // Build Sheet 1: App / Client Portal Test Cases
  buildSheet({
    sheetTitle: 'App Test Cases',
    bannerText: `📱 ${projectTitle.toUpperCase()} — APPLICATION & CLIENT PORTAL MANUAL QA SUITE`,
    subBanner: "Instructions: Test each scenario step-by-step. Set Column G to 'No (Pass)' or 'Yes (Fail)'. Enter bug notes in Col H and Jira ID in Col I.",
    headerColor: colors.appHeader,
    sepColor: colors.appSep,
    modTextColor: colors.appModText,
    bottomBorder: appBottomBorder,
    platformColName: 'Device / Browser Tested On',
    modulesData: appModulesData
  });

  // Build Sheet 2: Web Admin Test Cases
  buildSheet({
    sheetTitle: 'Web Admin Test Cases',
    bannerText: `🖥️ ${projectTitle.toUpperCase()} — WEB ADMIN & SUPER ADMIN QA TEST SUITE`,
    subBanner: "Instructions: Open Admin Portal in Chrome/Edge. Test administrative workflows. Mark Pass/Fail in Col G, add notes in Col H and Jira Ticket in Col I.",
    headerColor: colors.adminHeader,
    sepColor: colors.adminSep,
    modTextColor: colors.adminModText,
    bottomBorder: adminBottomBorder,
    platformColName: 'Browser Tested On',
    modulesData: adminModulesData
  });

  await wb.xlsx.writeFile(fileName);
  console.log(`✅ Excel QA workbook successfully generated: ${fileName}`);
}

module.exports = { generateQAWorkbook };
