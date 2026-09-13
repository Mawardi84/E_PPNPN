import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  status: string;
  color: string;
}

interface WeeklyChartProps {
  data: ChartData[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mx-6 mb-2">
      <h3 className="text-sm font-bold text-gray-800 mb-4">Tren 7 Hari Terakhir</h3>
      <div className="h-40 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 11 }} 
              dy={10}
            />
            <Tooltip 
              cursor={{ fill: '#f3f4f6' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-800 text-white text-xs py-1.5 px-3 rounded-lg font-medium shadow-lg">
                      {data.status}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={28}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
