# Forecast Review

A browser-local dashboard for January–August 2026 commodity forecast review across Family planning, Maternal health, Vaccines, Essential medicines, MedSurg, ARV, Malaria, Renal, Nutrition and Cancer. Includes executive indicators, programme and month filters, individual commodity trend charts, consumption/forecast/issue/receipt comparisons, detailed monthly tables, stock cover, rules-based actions, multi-file Excel/CSV import, an Excel template and CSV review export.

## Run

Requires Node.js 18 or later. Run `npm run dev`, then open http://127.0.0.1:4178. There is no package installation or build step. Authored static assets are tracked in `dist/`; deploy this folder to any static host. `npm test` runs calculation and Excel round-trip checks. `npm run check` checks source syntax.

## Data

The initial dataset is explicitly labelled **illustrative demonstration data**, covering only family planning and maternal health. The eight additional programme areas have no seeded commodities, quantities or risk assessments. Programme cards display “No data imported” until the user supplies a workbook. No real January–August workbooks were supplied. Imported workbooks are read in browser memory; they are not transmitted or persisted. A successful import replaces the dataset, and reloading restores the demo. Select all relevant files together. Files should be `.xlsx`, `.xls` or `.csv`, below 40 MB combined.

Required headers: `Commodity | Month | Forecast`. Preferred full layout: `Commodity | Programme | Month | Forecast | Consumption | Issues | Receipts | Closing Stock`. Headers are case and punctuation insensitive. Month values accept `YYYY-MM`, month names (2026 assumed), Excel date cells or Excel serial dates. Ambiguous slash dates are rejected; use ISO format. Dates outside January–August 2026 are rejected. Use one row per programme–commodity–month, with product strength, pack size and consistent unit in the commodity name. Commodity names are case insensitive; synonyms are not automatically merged. Negative quantities and invalid numbers are rejected. Blank numeric values are missing; zero is a reported zero.

All supported sheets across selected files are validated together. Sheets without the three required headers are skipped and reported. A malformed data row, duplicated programme–commodity–month or empty dataset rejects the entire import and retains the current data. An unknown product remains Unclassified unless Programme is supplied. Explicit recognised programme labels take precedence over classification by product name. Supported labels: Family planning / FP, Maternal health / MH, Vaccines / Vaccine / EPI, Essential medicines / EM, MedSurg / MedSurge / medical and surgical supplies, ARV / ARVs / antiretrovirals, Malaria, Renal, Nutrition, Cancer / Oncology, and Unclassified. Additional programme areas require an explicit programme label; no new product-name classifiers or example data are added. A commodity shared across programmes remains separate in calculations, drilldowns and exports.

## Calculation policy

- Variance = consumption minus forecast using matched months only. Variance % uses matched forecast as denominator and is unavailable for a zero denominator.
- Commodity accuracy = `max(0, 1 − sum(abs(consumption − forecast)) / sum(consumption)) × 100`, using matched monthly records. Zero summed actual consumption yields an unavailable score. Monthly errors never cancel. A perfect zero/zero period is also unscored.
- Executive mean accuracy equally weights available commodity scores. Quantities from different commodities are never summed. Imported units cannot be inferred; separate product strengths and pack sizes.
- Raw measure totals include their reported months; the table shows partial coverage. Paired variance is intentionally not computed by subtracting unpaired raw totals.
- Months of stock uses closing stock in the selected end month divided by the average consumption of all months in the trailing three-month window, shortened at January. The window may start before the selected review start month. Every consumption month in that window must be reported, and the average must be positive. Stock snapshots are not added across months.
- Low and high thresholds default to 3 and 6 months and can be edited. Accuracy below 80% prompts review. These are transparent planning assumptions, not asserted programme policy.
- Zero closing stock is flagged even if stock cover cannot be computed. Issues greater than receipts are labelled a flow review, not a proven stockout or supply gap. Recommendations require pipeline, lead-time, expiry, service and stockout context before procurement decisions.
- Missing consumption, receipts, issues, stock, forecast or programme classification generates data-quality prompts. Filtered periods with no records still retain known commodities so their missing coverage stays visible.

## Distribution

The provided GitHub repository is the project's source destination. Sites configuration supports a separate private preview deployment. No source workbook is included in Git or hosting artifacts. Excel parsing uses the locally bundled SheetJS CE 0.20.3 (`dist/vendor/xlsx.full.min.js`), licensed Apache-2.0. Font assets are requested from Google Fonts; system fallbacks work if unavailable. Optional WebMCP review/read/filter tools feature-detect support; they never upload workbook data. WebMCP browser contract validation is not claimed when the host does not expose a supported context.
