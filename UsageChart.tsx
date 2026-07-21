"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UsageChartProps {
  data: { date: string; calls: number }[];
}

export function UsageChart({ data }: UsageChartProps) {
  return (
    <div className="w-full h-80 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-100">API Requests Trend</h3>
        <p className="text-xs text-slate-400">Daily API traffic over the past week</p>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 border border-slate-850 p-3 rounded-2xl shadow-xl">
                      <p className="text-xs font-semibold text-slate-400 mb-1">{payload[0].payload.date}</p>
                      <p className="text-sm font-bold text-indigo-400">
                        {payload[0].value?.toLocaleString()} requests
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="calls"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCalls)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
