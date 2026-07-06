"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  paid: number;
  unpaid: number;
}

const COLORS = ["#22c55e", "#f43f5e"];

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function TuitionDonutChart({ paid, unpaid }: Props) {
  const data = [
    { name: "Paid", value: paid },
    { name: "Unpaid", value: unpaid },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          labelLine={false}
          label={CustomLabel}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [`${v} students`, ""]}
          contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 13 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 13, color: "#52525b" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
