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

// 日本時間の今日の日付を取得
function getJapanDate(): string {
  const now = new Date();
  // UTC時間に9時間（日本時間）を追加
  const japanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return japanTime.toISOString().split('T')[0];
}

export default function PublicPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const EMPLOYEES_PER_PAGE = 20; // 5×4 = 20人
  const PAGE_INTERVAL = 5000; // 5秒ごとにページ切り替え

  useEffect(() => {
    fetchPublicData();
    // 30秒ごとにデータを再取得
    const dataInterval = setInterval(fetchPublicData, 30000);
    return () => clearInterval(dataInterval);
  }, []);

  useEffect(() => {
    // ページ数を計算
    const totalPages = Math.ceil(employees.length / EMPLOYEES_PER_PAGE);
    
    if (totalPages <= 1) return; // 1ページ以下なら切り替え不要

    // ページ自動切り替え
    const pageInterval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, PAGE_INTERVAL);

    return () => clearInterval(pageInterval);
  }, [employees]);

  const fetchPublicData = async () => {
    const date = getJapanDate();
    const res = await fetch(`/api/public?date=${date}`);
    const data = await res.json();
    setEmployees(data);
  };

  // 現在のページの従業員を取得
  const startIndex = currentPage * EMPLOYEES_PER_PAGE;
  const endIndex = startIndex + EMPLOYEES_PER_PAGE;
  const displayEmployees = employees.slice(startIndex, endIndex);
  
  // 5×4のグリッドで表示
  const rows = [];
  for (let i = 0; i < EMPLOYEES_PER_PAGE; i += 5) {
    rows.push(displayEmployees.slice(i, i + 5));
  }

  // ページ数を計算
  const totalPages = Math.ceil(employees.length / EMPLOYEES_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">配置一覧</h1>
          {totalPages > 1 && (
            <div className="text-2xl font-semibold text-gray-700">
              {currentPage + 1} / {totalPages}
            </div>
          )}
        </div>

        {/* 5×4グリッド */}
        <div className="space-y-3">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-5 gap-3">
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
                    <div className="bg-white px-6 py-3 rounded-md shadow-md mb-4">
                      <div className="text-xl font-bold text-gray-800 whitespace-nowrap">
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

        {/* ページインジケーター（ドット） */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentPage
                    ? 'bg-blue-500 w-8'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}