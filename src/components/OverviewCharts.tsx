"use client";
import { useState } from "react";
type Group = {
  count: number;
  department?: string;
  currency: string;
  band?: string;
};
type Datum = { label: string; value: number };
const colors = [
  "#197653",
  "#45a884",
  "#79c7a2",
  "#b1dbc5",
  "#537eaa",
  "#9a86be",
  "#d7ab64",
  "#bf7e87",
];
function Chart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Datum[];
}) {
  const [type, setType] = useState("bar");
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const max = Math.max(1, ...data.map((d) => d.value));
  let offset = 0;
  return (
    <section className="chart-card">
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <select
          aria-label={`${title} chart type`}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="bar">Bar chart</option>
          <option value="donut">Donut chart</option>
        </select>
      </div>
      {!total ? (
        <p className="empty">No employees match these filters.</p>
      ) : (
        <div className="chart-body" key={type + JSON.stringify(data)}>
          {type === "bar" ? (
            <div className="chart-bars">
              {data.map((d, i) => (
                <div className="chart-bar-row" key={d.label}>
                  <span>{d.label}</span>
                  <div className="chart-track">
                    <div
                      className="chart-fill"
                      style={{
                        width: `${(d.value / max) * 100}%`,
                        background: colors[i % colors.length],
                        animationDelay: `${i * 45}ms`,
                      }}
                    />
                  </div>
                  <strong>{d.value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="donut-layout">
              <svg
                className="donut-chart"
                viewBox="0 0 200 200"
                role="img"
                aria-label={`${title}: ${total.toLocaleString()} employees`}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="74"
                  fill="none"
                  stroke="#edf3ef"
                  strokeWidth="26"
                />
                {data.map((d, i) => {
                  const portion = (d.value / total) * 100;
                  const start = offset;
                  offset += portion;
                  return (
                    <circle
                      key={d.label}
                      cx="100"
                      cy="100"
                      r="74"
                      pathLength="100"
                      fill="none"
                      stroke={colors[i % colors.length]}
                      strokeWidth="26"
                      strokeDasharray={`${portion} ${100 - portion}`}
                      strokeDashoffset={-start}
                      transform="rotate(-90 100 100)"
                    >
                      <title>
                        {d.label}: {d.value.toLocaleString()} (
                        {Math.round(portion)}%)
                      </title>
                    </circle>
                  );
                })}
                <text
                  x="100"
                  y="98"
                  textAnchor="middle"
                  className="donut-total"
                >
                  {total.toLocaleString()}
                </text>
                <text
                  x="100"
                  y="119"
                  textAnchor="middle"
                  className="donut-caption"
                >
                  EMPLOYEES
                </text>
              </svg>
              <div className="chart-legend">
                {data.map((d, i) => (
                  <div key={d.label}>
                    <i style={{ background: colors[i % colors.length] }} />
                    <span>{d.label}</span>
                    <strong>{d.value.toLocaleString()}</strong>
                    <small>{Math.round((d.value / total) * 100)}%</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
export default function OverviewCharts({
  departments,
  bands,
  currencies,
}: {
  departments: Group[];
  bands: Group[];
  currencies: string[];
}) {
  const [selected, setSelected] = useState("USD");
  const currency = currencies.includes(selected)
    ? selected
    : (currencies[0] ?? "");
  const counts = new Map<string, number>();
  for (const g of departments)
    counts.set(
      g.department ?? "Other",
      (counts.get(g.department ?? "Other") ?? 0) + g.count,
    );
  return (
    <div className="overview-charts">
      <Chart
        title="Employees by department"
        description="Team sizes across your current filters."
        data={[...counts]
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))}
      />
      <div className="distribution-chart">
        <label className="chart-currency">
          Salary currency
          <select
            aria-label="Salary distribution currency"
            value={currency}
            onChange={(e) => setSelected(e.target.value)}
          >
            {currencies.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
        <Chart
          title="Salary distribution"
          description={`Annual salary bands in ${currency || "the selected currency"}.`}
          data={["Under 50k", "50k-100k", "100k-150k", "150k+"].map(
            (label) => ({
              label,
              value:
                bands.find((g) => g.currency === currency && g.band === label)
                  ?.count ?? 0,
            }),
          )}
        />
      </div>
    </div>
  );
}
