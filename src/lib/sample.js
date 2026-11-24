const PERIODS = [
  "Q1 2024",
  "Q2 2024",
  "Q3 2024",
  "Q4 2024",
  "Q1 2025",
  "Q2 2025",
  "Q3 2025",
  "Q4 2025",
];

const LEAVES = {
  "Advisory & Consulting": [640000, 665000, 690000, 725000, 760000, 795000, 830000, 870000],
  Implementation: [430000, 455000, 470000, 500000, 525000, 548000, 575000, 600000],
  "Managed Services": [285000, 298000, 312000, 328000, 345000, 362000, 380000, 398000],
  "Training & Enablement": [96000, 101000, 98000, 105000, 108000, 112000, 116000, 121000],
  "Delivery Labor": [512000, 528000, 545000, 566000, 588000, 610000, 632000, 656000],
  Subcontractors: [148000, 155000, 158000, 168000, 174000, 182000, 190000, 198000],
  "Reimbursable Expenses": [62000, 64000, 67000, 69000, 72000, 74000, 77000, 80000],
  "Partner Compensation": [340000, 348000, 356000, 366000, 376000, 386000, 396000, 408000],
  "Sales & Marketing": [118000, 124000, 129000, 136000, 142000, 149000, 156000, 164000],
  "Practice Operations": [86000, 89000, 92000, 95000, 98000, 102000, 105000, 109000],
  "General & Administrative": [132000, 136000, 140000, 145000, 150000, 155000, 160000, 166000],
  "Depreciation & Amortization": [18000, 18500, 19000, 19500, 20000, 20500, 21000, 21500],
  "Interest Expense": [9000, 9000, 8800, 8800, 8600, 8600, 8400, 8400],
  "Income Tax": [12000, 15000, 18000, 24000, 30000, 36000, 42000, 48000],
};

const SPEC = [
  {
    label: "Total Revenue",
    level: 0,
    sum: ["Advisory & Consulting", "Implementation", "Managed Services", "Training & Enablement"],
  },
  { label: "Advisory & Consulting", level: 1 },
  { label: "Implementation", level: 1 },
  { label: "Managed Services", level: 1 },
  { label: "Training & Enablement", level: 1 },
  {
    label: "Total Direct Costs",
    level: 0,
    sum: ["Delivery Labor", "Subcontractors", "Reimbursable Expenses"],
  },
  { label: "Delivery Labor", level: 1 },
  { label: "Subcontractors", level: 1 },
  { label: "Reimbursable Expenses", level: 1 },
  { label: "Gross Profit", level: 0, diff: ["Total Revenue", "Total Direct Costs"] },
  {
    label: "Total Operating Expenses",
    level: 0,
    sum: ["Partner Compensation", "Sales & Marketing", "Practice Operations", "General & Administrative"],
  },
  { label: "Partner Compensation", level: 1 },
  { label: "Sales & Marketing", level: 1 },
  { label: "Practice Operations", level: 1 },
  { label: "General & Administrative", level: 1 },
  { label: "EBITDA", level: 0, diff: ["Gross Profit", "Total Operating Expenses"] },
  { label: "Depreciation & Amortization", level: 1 },
  { label: "Operating Income", level: 0, diff: ["EBITDA", "Depreciation & Amortization"] },
  { label: "Interest Expense", level: 1 },
  { label: "Income Tax", level: 1 },
  { label: "Net Income", level: 0, diff: ["Operating Income", "Interest Expense", "Income Tax"] },
];

function buildRows() {
  const values = {};
  const at = (key, index) => (LEAVES[key] ? LEAVES[key][index] : values[key]?.[index] ?? 0);

  for (const row of SPEC) {
    if (row.sum) {
      values[row.label] = PERIODS.map((_, index) =>
        row.sum.reduce((acc, key) => acc + at(key, index), 0)
      );
    } else if (row.diff) {
      values[row.label] = PERIODS.map((_, index) =>
        row.diff.reduce((acc, key, position) => (position === 0 ? at(key, index) : acc - at(key, index)), 0)
      );
    } else {
      values[row.label] = LEAVES[row.label];
    }
  }

  return SPEC.map((row) => ({ label: row.label, level: row.level, values: values[row.label] }));
}

export const SAMPLE_CSV = (() => {
  const lines = ["Period,Account,Level,Amount"];
  for (const row of buildRows()) {
    PERIODS.forEach((period, index) => {
      lines.push(`${period},${row.label},${row.level},${row.values[index]}`);
    });
  }
  return lines.join("\n");
})();

export const SAMPLE_CSV_NAME = "ps_pnl_export.csv";
export const SAMPLE_WORKBOOK_NAME = "Practice_PnL_Q4.twb";

export const SAMPLE_TWB = `<?xml version='1.0' encoding='utf-8' ?>
<workbook source-build='2024.1.0 (2024.1.0)' source-platform='win' version='18.1' xmlns:user='http://www.tableausoftware.com/xml/user'>
  <datasources>
    <datasource caption='Practice Finance Extract' inline='true' name='federated.0abc123' version='18.1'>
      <connection class='federated'>
        <named-connections>
          <named-connection caption='ps_pnl_export' name='textscan.1'>
            <connection class='textscan' directory='C:\\\\Finance\\\\extracts' filename='ps_pnl_export.csv' server='' />
          </named-connection>
        </named-connections>
        <relation connection='textscan.1' name='ps_pnl_export.csv' table='[ps_pnl_export#csv]' type='table' />
      </connection>
      <column caption='Account' datatype='string' name='[Account]' role='dimension' type='nominal' />
      <column caption='Period' datatype='string' name='[Period]' role='dimension' type='nominal' />
      <column caption='Level' datatype='integer' name='[Level]' role='dimension' type='ordinal' />
      <column caption='Amount' datatype='real' name='[Amount]' role='measure' type='quantitative' />
      <column caption='Gross Margin %' datatype='real' name='[Calculation_1024]' role='measure' type='quantitative'>
        <calculation class='tableau' formula='SUM([Gross Profit]) / SUM([Total Revenue])' />
      </column>
      <column caption='EBITDA' datatype='real' name='[Calculation_2048]' role='measure' type='quantitative'>
        <calculation class='tableau' formula='[Gross Profit] - [Total Operating Expenses]' />
      </column>
      <column caption='Realization Rate' datatype='real' name='[Calculation_3072]' role='measure' type='quantitative'>
        <calculation class='tableau' formula='SUM([Billed Amount]) / SUM([Standard Amount])' />
      </column>
      <column caption='Account (group)' datatype='string' name='[Account (group)]' role='dimension' type='nominal'>
        <calculation class='tableau' formula='IF CONTAINS([Account], &quot;Total&quot;) THEN &quot;Subtotal&quot; ELSE &quot;Detail&quot; END' />
      </column>
    </datasource>
  </datasources>
  <worksheets>
    <worksheet name='P&amp;L Statement'>
      <table>
        <view>
          <datasource-dependencies datasource='federated.0abc123'>
            <column caption='Account' datatype='string' name='[Account]' role='dimension' type='nominal' />
            <column caption='Period' datatype='string' name='[Period]' role='dimension' type='nominal' />
            <column caption='Amount' datatype='real' name='[Amount]' role='measure' type='quantitative' />
          </datasource-dependencies>
          <filter class='categorical' column='[federated.0abc123].[none:Period:nk]' filter-group='2'>
            <groupfilter function='member' level='[none:Period:nk]' member='&quot;Q1 2024&quot;' />
          </filter>
        </view>
        <panes>
          <pane id='1'>
            <mark class='Text' />
          </pane>
        </panes>
        <rows>[federated.0abc123].[none:Account:nk]</rows>
        <cols>[federated.0abc123].[none:Period:nk]</cols>
      </table>
    </worksheet>
    <worksheet name='Revenue by Practice'>
      <table>
        <view>
          <datasource-dependencies datasource='federated.0abc123'>
            <column caption='Account' datatype='string' name='[Account]' role='dimension' type='nominal' />
            <column caption='Amount' datatype='real' name='[Amount]' role='measure' type='quantitative' />
          </datasource-dependencies>
        </view>
        <panes>
          <pane id='1'>
            <mark class='Bar' />
          </pane>
        </panes>
        <rows>[federated.0abc123].[none:Account:nk]</rows>
        <cols>[federated.0abc123].[sum:Amount:qk]</cols>
      </table>
    </worksheet>
    <worksheet name='Margin Trend'>
      <table>
        <view>
          <datasource-dependencies datasource='federated.0abc123'>
            <column caption='Period' datatype='string' name='[Period]' role='dimension' type='nominal' />
            <column caption='Amount' datatype='real' name='[Amount]' role='measure' type='quantitative' />
          </datasource-dependencies>
        </view>
        <panes>
          <pane id='1'>
            <mark class='Line' />
          </pane>
        </panes>
        <rows>[federated.0abc123].[sum:Amount:qk]</rows>
        <cols>[federated.0abc123].[none:Period:nk]</cols>
      </table>
    </worksheet>
  </worksheets>
</workbook>
`;