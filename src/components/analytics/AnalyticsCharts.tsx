'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ANALYTICS_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export function ProfitLossAreaChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
        <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
          labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
        />
        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
        <Area type="monotone" name="Revenue" dataKey="Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
        <Area type="monotone" name="Expenses" dataKey="Expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PlanDistributionPieChart({ data }: { data: any[] }) {
  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Custom Legend */}
      <div className="absolute bottom-0 inset-x-0 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-zinc-400">
        {data.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ANALYTICS_COLORS[idx % ANALYTICS_COLORS.length] }} />
            <span>{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceTrafficBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} />
        <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
        <Bar dataKey="Check-ins" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrainerPortfolioBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} />
        <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
        <Bar dataKey="Members" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={25} />
      </BarChart>
    </ResponsiveContainer>
  );
}
