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
  rowspan: number;
  colspan: number;
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

  useEffect(() => {
    fetchActiveLayout();
    fetchPublicData();
    
    const dataInterval = setInterval(fetchPublicData, 30000);
    return () => clearInterval(dataInterval);
  }, []);

  const fetchActiveLayout = async () => {
    try {
      const res = await fetch('/api/display-layouts?active=true');
      const data = await res.json();
      if (data && data.length > 0) {
        setLayout(data[0]);
      } else {
        // デフォルトレイアウト
        setLayout({
          id: 0,
          layout_name: 'デフォルト',
          grid_rows: 12,
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-2xl text-white">読み込み中...</div>
      </div>
    );
  }

  // 各作業場の従業員を取得
  const getWorkplaceEmployees = (workplace_id: number) => {
    return employees.filter(emp => emp.workplace_id === workplace_id);
  };

  // セルが描画の開始位置かチェック
  const isCellStart = (row: number, col: number): boolean => {
    return layout.layout_config.cells.some(cell => 
      cell.row === row && cell.col === col
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-white text-center">作業配置表</h1>
        </div>

        {/* レイアウトグリッド表示 */}
        <div 
          className="grid gap-2"
          style={{ 
            gridTemplateColumns: `repeat(${layout.grid_cols}, 1fr)`,
            gridTemplateRows: `repeat(${layout.grid_rows}, 1fr)`
          }}
        >
          {Array.from({ length: layout.grid_rows }).map((_, row) =>
            Array.from({ length: layout.grid_cols }).map((_, col) => {
              // このセルが開始位置のセルを探す
              const cell = layout.layout_config.cells.find(c => 
                c.row === row && c.col === col
              );
              
              // 開始位置でない場合はスキップ
              if (!isCellStart(row, col)) {
                return null;
              }

              // セルが定義されていない場合は空セル
              if (!cell || !cell.workplace_id) {
                return (
                  <div
                    key={`${row}-${col}`}
                    className="rounded bg-gray-800"
                    style={{ 
                      gridRow: cell ? `span ${cell.rowspan}` : undefined,
                      gridColumn: cell ? `span ${cell.colspan}` : undefined,
                      minHeight: '80px'
                    }}
                  />
                );
              }

              const cellEmployees = getWorkplaceEmployees(cell.workplace_id);
              const bgColor = cellEmployees[0]?.workplace_color || '#DC2626';
              const textColor = getTextColor(bgColor);
              
              return (
                <div
                  key={`${row}-${col}`}
                  className="rounded shadow-lg overflow-hidden flex flex-col"
                  style={{ 
                    gridRow: `span ${cell.rowspan}`,
                    gridColumn: `span ${cell.colspan}`,
                    backgroundColor: bgColor,
                    minHeight: '80px'
                  }}
                >
                  {/* 作業場名ヘッダー */}
                  <div 
                    className="text-center font-bold py-3 px-2 border-b-4"
                    style={{ 
                      color: textColor,
                      borderColor: textColor,
                      fontSize: cell.rowspan > 2 ? '1.5rem' : '1.25rem'
                    }}
                  >
                    {cellEmployees[0]?.workplace_name || '未配置'}
                  </div>

                  {/* 従業員リスト */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {cellEmployees.length > 0 ? (
                      cellEmployees.map((employee) => (
                        <div
                          key={employee.employee_id}
                          className="bg-white rounded-full px-4 py-2 shadow-md"
                        >
                          <div className="text-base font-bold text-gray-800 text-center">
                            {employee.name}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-sm" style={{ color: textColor, opacity: 0.7 }}>
                        配置なし
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}