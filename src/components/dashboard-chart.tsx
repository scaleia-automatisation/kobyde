import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function DashboardChart({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  return <div className="dashboard-chart h-60 min-w-0 w-full" role="img" aria-label={`${label} : ${data.map((row) => `${row.name} ${row.value}`).join(', ')}`}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 14, right: 8, left: -24, bottom: 4 }} barSize={24}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 5" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval={0} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <Tooltip cursor={{ fill: 'var(--secondary)' }} content={({ active, payload }) => active && payload?.length ? <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-subtle">{payload[0]?.payload.name} : {payload[0]?.value}</div> : null} />
        <Bar dataKey="value" radius={[5, 5, 0, 0]} animationDuration={450}>
          {data.map((row, i) => <Cell key={row.name} fill={['var(--aurora-solid-1)', 'var(--aurora-solid-2)', 'var(--aurora-solid-5)', 'var(--aurora-solid-3)'][i % 4]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}