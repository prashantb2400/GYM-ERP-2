'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AttendanceChartProps {
  chartData: Array<{ name: string; count: number }>;
}

export default function AttendanceOverviewChart({ chartData }: AttendanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
        <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
          labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
      </BarChart>
    </ResponsiveContainer>
  );
}
