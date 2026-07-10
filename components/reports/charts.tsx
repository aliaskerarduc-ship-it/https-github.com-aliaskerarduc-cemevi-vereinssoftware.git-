'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#80D8C3', '#A19AD3', '#FF6363'];
const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export default function RechartsCharts({ monthlyData, memberStatusData }: { monthlyData: any[]; memberStatusData: any[] }) {
  const chartData = (monthlyData ?? []).map((d: any, i: number) => ({
    month: months[i] ?? `M${i+1}`,
    Spenden: d?.donations ?? 0,
    Beiträge: d?.contributions ?? 0,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl p-5 shadow-sm">
        <h3 className="font-display font-bold mb-4">Monatliche Einnahmen</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 10 }}>
              <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis tickLine={false} tick={{ fontSize: 10 }} label={{ value: 'Euro', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Beiträge" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spenden" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-card rounded-xl p-5 shadow-sm">
        <h3 className="font-display font-bold mb-4">Mitgliederstatus</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={memberStatusData ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }: any) => `${name}: ${value}`}>
                {(memberStatusData ?? []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
