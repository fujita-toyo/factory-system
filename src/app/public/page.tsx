'use client';

import { useState, useEffect } from 'react';

interface Employee {
  employee_id: number;
  employee_number: string;
  name: string;
  attendance_status: string;
  workplace_id: number | null;
  workplace_name: string | null;
  workplace_color: string | null;
}

interface LayoutCell {
  row: number;
  col: number;
  workplace_id: number | null;
}

interface DisplayLayout {
  id: number;
  layout_name: string;
  grid_rows: number;
  grid_cols: number;
  layout_config: {
    cells: LayoutCell[];
  };
}

function getTextColor(bgColor: string | null): string {
  if (!bgColor) return '#000000';
  
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

function getJapanDate(): string {
  const now = new Date();
  const japanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return japanTime.toISOString().split('T')[0];
}

export default function PublicPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [layout, setLayout] = useState<DisplayLayout | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    fetchActiveLayout();
    fetchPublicData();
    
    const dataInterval = setInterval(fetchPublicData, 30000);
    return () => clearInterval(dataInterval);
  }, []);

  useEffect(() => {
    if (!layout) return;

    // レイアウトに配置されているセルの数を計算
    const cellsWithWorkplace = layout.layout_config.cells.filter(c => c.workplace_id !== null);
    const totalCells = cellsWithWorkplace.length;
    
    if (totalCells === 0) return;

    // 各セルに表示する従業員数を計算
    const employeesPerPage = totalCells;
    const totalPages = Math.ceil(employees.length / employeesPerPage);
    
    if (totalPages <= 1) return;

    const pageInterval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 5000);

    return () => clearInterval(pageInterval);
  }, [employees, layout]);

  const fetchActiveLayout = async () => {
    try {
      const res = await fetch('/api/display-layouts?active=true');
      const data = await res.json();
      if (data && data.length > 0) {
        setLayout(data[0]);
      } else {
        // デフォルトレイアウト（6×2グリッド）
        setLayout({
          id: 0,
          layout_name: 'デフォルト',
          grid_rows: 6,
          grid_cols: 2,
          layout_config: { cells: [] }
        });
      }
    } catch (error) {
      console.error('Error fetching layout:', error);
    }
  };

  const fetchPublicData = async () => {
    const date = getJapanDate();
    const res = await fetch(`/api/public?date=${date}`);
    const data = await res.json();
    setEmployees(data);
  };

  if (!layout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-2xl">読み込み中...</div>
      </div>
    );
  }

  // レイアウトに基づいて従業員を配置
  const cellsWithWorkplace = layout.layout_config.cells.filter(c => c.workplace_id !== null);
  const employeesPerPage = cellsWithWorkplace.length || (layout.grid_rows * layout.grid_cols);
  const totalPages = Math.ceil(employees.length / employeesPerPage);
  
  const startIndex = currentPage * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;
  const displayEmployees = employees.slice(startIndex, endIndex);

  // 各セルに表示する従業員を割り当て
  const getCellEmployees = (workplace_id: number) => {
    return displayEmployees.filter(emp => emp.workplace_id === workplace_id);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-white">配置一覧</h1>
          {totalPages > 1 && (
            <div className="text-2xl font-semibold text-white">
              {currentPage + 1} / {totalPages}
            </div>
          )}
        </div>

        {/* レイアウトグリッド表示 */}
        <div 
          className="grid gap-3"
          style={{ 
            gridTemplateColumns: `repeat(${layout.grid_cols}, 1fr)`,
            gridTemplateRows: `repeat(${layout.grid_rows}, 1fr)`
          }}
        >
          {Array.from({ length: layout.grid_rows }).map((_, row) =>
            Array.from({ length: layout.grid_cols }).map((_, col) => {
              const cell = layout.layout_config.cells.find(c => c.row === row && c.col === col);
              
              if (!cell || !cell.workplace_id) {
                return (
                  <div
                    key={`${row}-${col}`}
                    className="rounded-lg bg-gray-800"
                    style={{ minHeight: '120px' }}
                  />
                );
              }

              const cellEmployees = getCellEmployees(cell.workplace_id);
              
              return (
                <div
                  key={`${row}-${col}`}
                  className="rounded-lg shadow-lg p-3 overflow-hidden"
                  style={{ 
                    backgroundColor: cellEmployees[0]?.workplace_color || '#4B5563',
                    minHeight: '120px'
                  }}
                >
                  {/* 作業場名 */}
                  <div 
                    className="text-center font-bold text-lg mb-2 pb-2 border-b-2"
                    style={{ 
                      color: getTextColor(cellEmployees[0]?.workplace_color || null),
                      borderColor: getTextColor(cellEmployees[0]?.workplace_color || null)
                    }}
                  >
                    {cellEmployees[0]?.workplace_name || '未配置'}
                  </div>

                  {/* 従業員リスト */}
                  <div className="space-y-1">
                    {cellEmployees.map((employee) => (
                      <div
                        key={employee.employee_id}
                        className="bg-white px-3 py-2 rounded shadow-sm"
                      >
                        <div className="text-base font-bold text-gray-800 text-center">
                          {employee.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ページインジケーター */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentPage
                    ? 'bg-blue-500 w-8'
                    : 'bg-gray-500'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}