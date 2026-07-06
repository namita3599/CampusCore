"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  data: { branch: string; count: number }[];
}

const BRANCH_COLORS: Record<string, string> = {
  "Computer Science":     "#6366f1",
  "Mechanical":           "#f59e0b",
  "Civil":                "#10b981",
  "Electronics":          "#3b82f6",
  "Chemical":             "#f43f5e",
  "Information Technology": "#8b5cf6",
};

const DEFAULT_COLOR = "#94a3b8";

export default function BranchBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="branch"
          tick={{ fontSize: 12, fill: "#52525b" }}
          tickLine={false}
          axisLine={false}
          width={145}
        />
        <Tooltip
          formatter={(v: number) => [`${v} students`, "Enrolled"]}
          contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 13 }}
          cursor={{ fill: "#f4f4f5" }}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell
              key={entry.branch}
              fill={BRANCH_COLORS[entry.branch] ?? DEFAULT_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
