'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Employee {
  employee_id: number;
  employee_number: string;
  name: string;
  shift_type: string;
  workplace_id: number | null;
  workplace_name: string | null;
  workplace_number: number | null;
  workplace_color: string | null;
}

interface Workplace {
  id: number;
  number: number;
  name: string;
  color: string | null;
  can_assign: boolean;  // ← 追加
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

export default function AssignmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [layout, setLayout] = useState<DisplayLayout | null>(null);
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchWorkplaces();
    fetchActiveLayout();
  }, []);

  useEffect(() => {
    if (date) {
      fetchAssignments();
    }
  }, [date]);

  // 代わりにこれを追加
  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
  }, []);


  const fetchWorkplaces = async () => {
    const res = await fetch('/api/workplaces');
    const data = await res.json();
    setWorkplaces(data);
  };

  const fetchActiveLayout = async () => {
    try {
      const res = await fetch('/api/display-layouts?active=true');
      const data = await res.json();
      if (data && data.length > 0) {
        setLayout(data[0]);
      }
    } catch (error) {
      console.error('Error fetching layout:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      // 出勤データを取得（未配置含む全員）
      const attendanceRes = await fetch(`/api/attendance?date=${date}`);
      const attendanceData = await attendanceRes.json();
      
      // 配置データを取得
      const assignmentRes = await fetch(`/api/assignment?date=${date}`);
      const assignmentData = await assignmentRes.json();
      
      // 出勤している従業員のみをフィルタ
      const attendingEmployees = attendanceData.filter(
        (emp: any) => emp.attendance_status === '出勤'
      );
      
      // 配置情報をマージ
      const mergedData = attendingEmployees.map((emp: any) => {
        const assignment = assignmentData.find(
          (a: any) => a.employee_id === emp.id
        );
        return {
          employee_id: emp.id,
          employee_number: emp.employee_number,
          name: emp.name,
          shift_type: emp.shift_type,
          workplace_id: assignment?.workplace_id || null,
          workplace_name: assignment?.workplace_name || null,
          workplace_number: assignment?.workplace_number || null,
          workplace_color: assignment?.workplace_color || null,
        };
      });
      
      setEmployees(mergedData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleAssign = async (employeeId: number, workplaceId: number) => {
    await fetch('/api/assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        workplace_id: workplaceId,
        date,
      }),
    });
    fetchAssignments();
  };

  const handleRemove = async (employeeId: number) => {
    await fetch(`/api/assignment?employee_id=${employeeId}&date=${date}`, {
      method: 'DELETE',
    });
    fetchAssignments();
  };

  const getUnassignedEmployees = (shiftType: string) => {
    return employees.filter(
      (e) => !e.workplace_id && e.shift_type === shiftType
    );
  };

  // 公開ページと同じロジック
  const getWorkplaceEmployees = (workplace_id: number) => {
    return employees.filter(emp => emp.workplace_id === workplace_id);
  };

  const getWorkplace = (workplace_id: number) => {
    return workplaces.find(w => w.id === workplace_id);
  };

  const getCellAtStart = (row: number, col: number): LayoutCell | null => {
    if (!layout) return null;
    return layout.layout_config.cells.find(cell => 
      cell.row === row && cell.col === col
    ) || null;
  };

  const isCoveredByOtherCell = (row: number, col: number): boolean => {
    if (!layout) return false;
    return layout.layout_config.cells.some(cell => {
      if (cell.row === row && cell.col === col) {
        return false;
      }
      return row >= cell.row && row < cell.row + cell.rowspan &&
             col >= cell.col && col < cell.col + cell.colspan;
    });
  };

  // ドラッグ開始
  const handleDragStart = (employee: Employee) => {
    setDraggedEmployee(employee);
  };

  // ドラッグオーバー（自動スクロール機能付き）
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  
    // 自動スクロールの処理
    const scrollZone = 100; // 上下100pxの範囲でスクロール開始
    const scrollSpeed = 10; // スクロール速度
  
    const mouseY = e.clientY;
    const windowHeight = window.innerHeight;
  
    // 上端に近い場合は上にスクロール
    if (mouseY < scrollZone) {
      if (!autoScrollIntervalRef.current) {
        autoScrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, -scrollSpeed);
        }, 16);
      }
    }
    // 下端に近い場合は下にスクロール
    else if (mouseY > windowHeight - scrollZone) {
      if (!autoScrollIntervalRef.current) {
        autoScrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 16);
      }
    }
    // 中央エリアの場合はスクロールを停止
    else {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    }
  };

  /// ドロップ（修正版）
  const handleDrop = async (workplaceId: number) => {
    if (!draggedEmployee) return;

    // 自動スクロールを停止
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    // 作業場の配置可否をチェック
    const workplace = getWorkplace(workplaceId);
    if (workplace && !workplace.can_assign) {
      alert('この作業場には人員を配置できません');
      setDraggedEmployee(null);
      return;
    }

    if (draggedEmployee.workplace_id) {
      await handleRemove(draggedEmployee.employee_id);
    }
  
    await handleAssign(draggedEmployee.employee_id, workplaceId);
    setDraggedEmployee(null);
  };

  // 未配置エリアにドロップ
  const handleDropToUnassigned = async () => {
    if (!draggedEmployee || !draggedEmployee.workplace_id) return;
    
    // 自動スクロールを停止
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  
    await handleRemove(draggedEmployee.employee_id);
    setDraggedEmployee(null);
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (!layout) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">配置登録</h1>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
            有効なレイアウトが設定されていません。先に「表示レイアウト設定」でレイアウトを作成し、有効化してください。
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 bg-gray-500 text-white px-6 py-3 rounded-md hover:bg-gray-600"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">配置登録</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            戻る
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <label className="block text-lg font-semibold mb-2">日付選択</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border rounded-md text-lg"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 左側: 未配置の人員 */}
          <div 
            className="bg-white p-4 rounded-lg shadow-md"
            onDragOver={handleDragOver}
            onDrop={handleDropToUnassigned}
          >
            <h2 className="text-xl font-semibold mb-4">未配置の人員</h2>

            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-blue-600">早番</h3>
              <div className="space-y-2">
                {getUnassignedEmployees('早番').map((employee) => (
                  <div
                    key={employee.employee_id}
                    draggable
                    onDragStart={() => handleDragStart(employee)}
                    className="p-2 bg-blue-50 border border-blue-200 rounded cursor-move hover:bg-blue-100"
                  >
                    <div className="font-semibold text-sm">{employee.name}</div>
                    <div className="text-xs text-gray-600">{employee.employee_number}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-purple-600">遅番</h3>
              <div className="space-y-2">
                {getUnassignedEmployees('遅番').map((employee) => (
                  <div
                    key={employee.employee_id}
                    draggable
                    onDragStart={() => handleDragStart(employee)}
                    className="p-2 bg-purple-50 border border-purple-200 rounded cursor-move hover:bg-purple-100"
                  >
                    <div className="font-semibold text-sm">{employee.name}</div>
                    <div className="text-xs text-gray-600">{employee.employee_number}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側: 公開ページと同じレイアウト表示 */}
          <div className="lg:col-span-3">
            <div 
              className="grid gap-2"
              style={{ 
                gridTemplateColumns: `repeat(${layout.grid_cols}, 1fr)`,
                gridTemplateRows: `repeat(${layout.grid_rows}, 1fr)`
              }}
            >
              {Array.from({ length: layout.grid_rows }).map((_, row) =>
                Array.from({ length: layout.grid_cols }).map((_, col) => {
                  // 他のセルに覆われている場合はスキップ
                  if (isCoveredByOtherCell(row, col)) {
                    return null;
                  }

                  // このセルが開始位置のセルを取得
                  const cell = getCellAtStart(row, col);

                  // セルが定義されていない場合は空セル
                  if (!cell || !cell.workplace_id) {
                    return (
                      <div
                        key={`${row}-${col}`}
                        className="rounded bg-gray-300"
                        style={{ 
                          gridRow: cell ? `span ${cell.rowspan}` : undefined,
                          gridColumn: cell ? `span ${cell.colspan}` : undefined,
                          minHeight: '100px'
                        }}
                      />
                    );
                  }

                  const cellEmployees = getWorkplaceEmployees(cell.workplace_id);
                  const workplace = getWorkplace(cell.workplace_id);
                  const bgColor = workplace?.color || '#DC2626';
                  const textColor = getTextColor(bgColor);
                  
                  return (
                    <div
                    key={`${row}-${col}`}
                    onDragOver={workplace?.can_assign ? handleDragOver : undefined}  // ← 修正
                    onDrop={workplace?.can_assign ? () => handleDrop(cell.workplace_id!) : undefined}  // ← 修正
                    className={`rounded shadow-lg overflow-hidden flex flex-col cursor-pointer hover:shadow-xl transition-shadow ${
                      workplace?.can_assign ? '' : 'opacity-50'  // ← 追加（配置不可は半透明に）
                    }`}
                    style={{ 
                      gridRow: `span ${cell.rowspan}`,
                      gridColumn: `span ${cell.colspan}`,
                      backgroundColor: bgColor,
                      minHeight: '100px'
                    }}
                  >
                    {/* 作業場名ヘッダー */}
                  <div 
                    className="text-center font-bold py-2 px-2 border-b-4"
                    style={{ 
                      color: textColor,
                      borderColor: textColor,
                      fontSize: cell.rowspan > 2 ? '1.25rem' : '1rem'
                    }}
                  >
                    {workplace?.name || '未配置'}
                    {workplace && !workplace.can_assign && (  // ← 追加（配置不可マーク）
                      <span className="text-xs block mt-1">（配置不可）</span>
                    )}
                  </div>

                      {/* 従業員リスト（公開ページと同じ + 削除ボタン） */}
                      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                        {cellEmployees.length > 0 ? (
                          cellEmployees.map((employee) => (
                            <div
                              key={employee.employee_id}
                              draggable
                              onDragStart={() => handleDragStart(employee)}
                              className="bg-white rounded-full px-3 py-2 shadow-md cursor-move hover:shadow-lg transition-shadow"
                            >
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-bold text-gray-800">
                                  {employee.name}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(employee.employee_id);
                                  }}
                                  className="bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {employee.shift_type}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-sm" style={{ color: textColor, opacity: 0.7 }}>
                            ドラッグして配置
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
      </div>
    </div>
  );
}