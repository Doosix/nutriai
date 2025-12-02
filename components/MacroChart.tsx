
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { NutritionData } from '../types';

interface MacroChartProps {
  data: NutritionData;
}

const MacroChart: React.FC<MacroChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Protein', value: data.protein, color: '#60a5fa' }, // Blue-400
    { name: 'Carbs', value: data.carbs, color: '#34d399' },   // Emerald-400
    { name: 'Fat', value: data.fat, color: '#fbbf24' },      // Amber-400
  ];

  // Prevent rendering empty chart
  if (data.protein === 0 && data.carbs === 0 && data.fat === 0) {
    return (
      <div className="h-48 w-full flex items-center justify-center text-emerald-200 bg-white/5 rounded-full border border-dashed border-emerald-800/30">
        No macros
      </div>
    );
  }

  return (
    <div className="h-32 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={55}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MacroChart;
