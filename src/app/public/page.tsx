'use client';

import { useState, useEffect } from 'react';

interface Employee {
  employee_id: number;
  employee_number: string;
  name: string;
  attendance_status: string;
  workplace_name: string | null;
  workplace_color: string | null;
}

// 色の明るさを計算する関数
function getTextColor(bgColor: string | null): string {
  if (!bgColor) return '#000000';
  
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

export default function PublicPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (date) {
      fetchPublicData();
    }
  }, [date]);

  const fetchPublicData = async () => {
    const res = await fetch(`/api/public?date=${date}`);
    const data = await res.json();
    setEmployees(data);
  };

  // 5×5のグリッドで表示（最大25人）
  const displayEmployees = employees.slice(0, 25);
  const rows = [];
  for (let i = 0; i < 25; i += 5) {
    rows.push(displayEmployees.slice(i, i + 5));
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-6">配置一覧</h1>

        {/* 日付選択 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border rounded-md text-lg"
          />
        </div>

        {/* 5×5グリッド */}
        <div className="space-y-4">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-5 gap-4">
              {row.map((employee) => {
                const bgColor = employee.attendance_status === '休み'
                  ? '#000000'
                  : employee.workplace_color || '#9CA3AF';
                
                const textColor = getTextColor(bgColor);

                return (
                  <div
                    key={employee.employee_id}
                    className="aspect-square rounded-lg shadow-lg p-4 flex flex-col items-center justify-center"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* 名前ボックス（白いボックス） */}
                    <div className="bg-white px-8 py-4 rounded-md shadow-md mb-4">
                      <div className="text-2xl font-bold text-gray-800 whitespace-nowrap">
                        {employee.name}
                      </div>
                    </div>
                    
                    {/* 配置場所（大きく表示） */}
                    <div 
                      className="text-2xl font-bold text-center"
                      style={{ color: textColor }}
                    >
                      {employee.attendance_status === '休み'
                        ? '休み'
                        : employee.workplace_name || '未配置'}
                    </div>
                  </div>
                );
              })}
              {/* 空のセルを埋める */}
              {row.length < 5 &&
                Array.from({ length: 5 - row.length }).map((_, i) => (
                  <div
                    key={`empty-${rowIndex}-${i}`}
                    className="aspect-square rounded-lg bg-gray-200"
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}