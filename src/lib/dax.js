const MONEY = "$#,##0;($#,##0)";

function daxString(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function safeName(label, used) {
  let base = String(label).replace(/[[\]]/g, "").trim() || "Measure";
  if (base.length > 60) base = base.slice(0, 60);
  let name = base;
  let counter = 2;
  while (used.has(name.toLowerCase())) {
    name = `${base} ${counter}`;
    counter += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

export function buildMeasures(pnl) {
  const used = new Set(["total amount"]);
  const measures = [
    { name: "Total Amount", kind: "base", formatString: MONEY, expression: "SUM ( 'Fact P&L'[Amount] )" },
  ];
  const names = new Map();

  for (const row of pnl.rows) {
    const name = safeName(row.label, used);
    names.set(row.label, name);
    measures.push({
      name,
      kind: row.isTotal ? "line item" : "account",
      formatString: MONEY,
      expression: `CALCULATE ( [Total Amount], 'Dim Account'[Account] = ${daxString(row.label)} )`,
    });
  }

  const find = (pattern) => pnl.rows.find((row) => pattern.test(row.label));
  const revenue = find(/^total revenue$/i) || find(/^net revenue$/i) || find(/revenue/i);
  const gross = find(/^gross profit$/i);
  const ebitda = find(/^ebitda$/i);
  const netIncome = find(/^net income$/i);
  const opex = find(/^total operating expenses$/i) || find(/operating expenses/i);

  const ratio = (label, numerator, denominator) => {
    if (!numerator || !denominator || numerator.label === denominator.label) return;
    measures.push({
      name: safeName(label, used),
      kind: "ratio",
      formatString: "0.0%",
      expression: `DIVIDE ( [${names.get(numerator.label)}], [${names.get(denominator.label)}] )`,
    });
  };

  ratio("Gross Margin %", gross, revenue);
  ratio("EBITDA Margin %", ebitda, revenue);
  ratio("Net Margin %", netIncome, revenue);
  ratio("Operating Expense Ratio", opex, revenue);

  if (pnl.lag) {
    measures.push({
      name: safeName("Total Amount LY", used),
      kind: "time intelligence",
      formatString: MONEY,
      expression: `CALCULATE ( [Total Amount], FILTER ( ALL ( 'Dim Period' ), 'Dim Period'[Sort Order] = MAX ( 'Dim Period'[Sort Order] ) - ${pnl.lag} ) )`,
    });
    measures.push({
      name: safeName("Total Amount YoY %", used),
      kind: "time intelligence",
      formatString: "0.0%;-0.0%",
      expression: "DIVIDE ( [Total Amount] - [Total Amount LY], [Total Amount LY] )",
    });
  } else if (pnl.hasDate) {
    measures.push({
      name: safeName("Total Amount LY", used),
      kind: "time intelligence",
      formatString: MONEY,
      expression: "CALCULATE ( [Total Amount], SAMEPERIODLASTYEAR ( 'Dim Period'[Date] ) )",
    });
    measures.push({
      name: safeName("Total Amount YoY %", used),
      kind: "time intelligence",
      formatString: "0.0%;-0.0%",
      expression: "DIVIDE ( [Total Amount] - [Total Amount LY], [Total Amount LY] )",
    });
  }

  return measures;
}