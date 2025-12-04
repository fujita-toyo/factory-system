'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Workplace {
  id: number;
  number: number;
  name: string;
  color: string;
}

interface LayoutCell {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  workplace_id: number | null;
}

interface DisplayLayout {
  id?: number;
  layout_name: string;
  grid_rows: number;
  grid_cols: number;
  layout_config: {
    cells: LayoutCell[];
  };
  is_active?: boolean;
}

export default function DisplayLayoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [layouts, setLayouts] = useState<DisplayLayout[]>([]);
  const [currentLayout, setCurrentLayout] = useState<DisplayLayout>({
    layout_name: '新規レイアウト',
    grid_rows: 12,
    grid_cols: 2,
    layout_config: { cells: [] }
  });
  const [selectedWorkplace, setSelectedWorkplace] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectionStart, setSelectionStart] = useState<{row: number, col: number} | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{row: number, col: number} | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWorkplaces();
      fetchLayouts();
    }
  }, [status]);

  const fetchWorkplaces = async () => {
    const res = await fetch('/api/workplaces');
    const data = await res.json();
    setWorkplaces(data);
  };

  const fetchLayouts = async () => {
    const res = await fetch('/api/display-layouts');
    const data = await res.json();
    setLayouts(data);
  };

  // セルが範囲選択に含まれているかチェック
  const isInSelection = (row: number, col: number): boolean => {
    if (!selectionStart || !selectionEnd) return false;
    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // セルがすでに配置されているかチェック
  const isCellOccupied = (row: number, col: number): boolean => {
    return currentLayout.layout_config.cells.some(cell => {
      return row >= cell.row && row < cell.row + cell.rowspan &&
             col >= cell.col && col < cell.col + cell.colspan;
    });
  };

  // セルの範囲選択開始
  const handleMouseDown = (row: number, col: number) => {
    if (!selectedWorkplace) return;
    if (isCellOccupied(row, col)) return;
    setSelectionStart({ row, col });
    setSelectionEnd({ row, col });
  };

  // セルの範囲選択中
  const handleMouseEnter = (row: number, col: number) => {
    if (!selectionStart || !selectedWorkplace) return;
    setSelectionEnd({ row, col });
  };

  // セルの範囲選択終了
  const handleMouseUp = () => {
    if (!selectionStart || !selectionEnd || !selectedWorkplace) return;

    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);

    // 選択範囲内に既に配置されているセルがあるかチェック
    let hasOccupied = false;
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (isCellOccupied(r, c)) {
          hasOccupied = true;
          break;
        }
      }
      if (hasOccupied) break;
    }

    if (hasOccupied) {
      alert('選択範囲内に既に配置されているセルがあります');
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const newCell: LayoutCell = {
      row: minRow,
      col: minCol,
      rowspan: maxRow - minRow + 1,
      colspan: maxCol - minCol + 1,
      workplace_id: selectedWorkplace
    };

    setCurrentLayout({
      ...currentLayout,
      layout_config: {
        cells: [...currentLayout.layout_config.cells, newCell]
      }
    });

    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // セルの削除
  const handleCellClear = (row: number, col: number) => {
    const newCells = currentLayout.layout_config.cells.filter(cell => {
      return !(row >= cell.row && row < cell.row + cell.rowspan &&
               col >= cell.col && col < cell.col + cell.colspan);
    });
    setCurrentLayout({
      ...currentLayout,
      layout_config: { cells: newCells }
    });
  };

  const saveLayout = async () => {
    try {
      if (editingId) {
        await fetch('/api/display-layouts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...currentLayout, id: editingId })
        });
      } else {
        await fetch('/api/display-layouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentLayout)
        });
      }
      alert('レイアウトを保存しました');
      fetchLayouts();
      resetForm();
    } catch (error) {
      alert('保存に失敗しました');
    }
  };

  const activateLayout = async (id: number) => {
    const layout = layouts.find(l => l.id === id);
    if (!layout) return;

    try {
      await fetch('/api/display-layouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...layout, is_active: true })
      });
      alert('レイアウトを有効化しました');
      fetchLayouts();
    } catch (error) {
      alert('有効化に失敗しました');
    }
  };

  const deleteLayout = async (id: number) => {
    if (!confirm('このレイアウトを削除しますか?')) return;

    try {
      await fetch(`/api/display-layouts?id=${id}`, { method: 'DELETE' });
      alert('レイアウトを削除しました');
      fetchLayouts();
    } catch (error) {
      alert('削除に失敗しました');
    }
  };

  const loadLayout = (layout: DisplayLayout) => {
    setCurrentLayout(layout);
    setEditingId(layout.id || null);
  };

  const resetForm = () => {
    setCurrentLayout({
      layout_name: '新規レイアウト',
      grid_rows: 12,
      grid_cols: 2,
      layout_config: { cells: [] }
    });
    setEditingId(null);
  };

  // 指定位置のセル情報を取得
  const getCellAtPosition = (row: number, col: number): LayoutCell | null => {
    return currentLayout.layout_config.cells.find(cell => {
      return row >= cell.row && row < cell.row + cell.rowspan &&
             col >= cell.col && col < cell.col + cell.colspan;
    }) || null;
  };

  // セルが描画の開始位置かチェック
  const isCellStart = (row: number, col: number): boolean => {
    const cell = getCellAtPosition(row, col);
    return cell !== null && cell.row === row && cell.col === col;
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">表示レイアウト設定</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            戻る
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側: レイアウト編集 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">レイアウト編集</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">レイアウト名</label>
                <input
                  type="text"
                  value={currentLayout.layout_name}
                  onChange={(e) => setCurrentLayout({ ...currentLayout, layout_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">行数</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={currentLayout.grid_rows}
                    onChange={(e) => setCurrentLayout({ ...currentLayout, grid_rows: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">列数</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={currentLayout.grid_cols}
                    onChange={(e) => setCurrentLayout({ ...currentLayout, grid_cols: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              {/* グリッド表示 */}
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">
                  💡 作業場を選択 → ドラッグで範囲選択 → 離すと配置 / 右クリックで削除
                </p>
                <div 
                  className="grid gap-1 select-none" 
                  style={{ gridTemplateColumns: `repeat(${currentLayout.grid_cols}, 1fr)` }}
                  onMouseLeave={() => {
                    setSelectionStart(null);
                    setSelectionEnd(null);
                  }}
                >
                  {Array.from({ length: currentLayout.grid_rows }).map((_, row) =>
                    Array.from({ length: currentLayout.grid_cols }).map((_, col) => {
                      const cell = getCellAtPosition(row, col);
                      const isStart = isCellStart(row, col);
                      const inSelection = isInSelection(row, col);

                      // すでに配置されているセルで、開始位置でない場合はスキップ
                      if (cell && !isStart) {
                        return null;
                      }

                      const workplace = cell?.workplace_id 
                        ? workplaces.find(w => w.id === cell.workplace_id)
                        : null;

                      return (
                        <div
                          key={`${row}-${col}`}
                          onMouseDown={() => handleMouseDown(row, col)}
                          onMouseEnter={() => handleMouseEnter(row, col)}
                          onMouseUp={handleMouseUp}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleCellClear(row, col);
                          }}
                          className="relative border-2 rounded cursor-pointer hover:border-blue-400 transition-all"
                          style={{
                            gridRow: cell ? `span ${cell.rowspan}` : undefined,
                            gridColumn: cell ? `span ${cell.colspan}` : undefined,
                            backgroundColor: workplace?.color || (inSelection ? '#bfdbfe' : '#e5e7eb'),
                            borderColor: inSelection ? '#3b82f6' : '#d1d5db',
                            minHeight: '60px'
                          }}
                        >
                          {workplace && (
                            <div className="absolute inset-0 flex items-center justify-center p-2">
                              <span 
                                className="text-base font-bold text-center break-words"
                                style={{ color: getTextColor(workplace.color) }}
                              >
                                {workplace.name}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ※ドラッグで範囲選択してセルを結合 / 右クリックで削除
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={saveLayout}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingId ? '更新' : '保存'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  クリア
                </button>
              </div>
            </div>
          </div>

          {/* 右側: 作業場リストと保存済みレイアウト */}
          <div className="space-y-4">
            {/* 作業場選択 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">作業場選択</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {workplaces.map(workplace => (
                  <button
                    key={workplace.id}
                    onClick={() => setSelectedWorkplace(workplace.id)}
                    className={`w-full p-3 rounded text-left transition-all ${
                      selectedWorkplace === workplace.id
                        ? 'ring-2 ring-blue-500 scale-105'
                        : 'hover:scale-102'
                    }`}
                    style={{
                      backgroundColor: workplace.color,
                      color: getTextColor(workplace.color)
                    }}
                  >
                    <div className="font-bold">{workplace.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 保存済みレイアウト */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">保存済みレイアウト</h2>
              <div className="space-y-2">
                {layouts.map(layout => (
                  <div key={layout.id} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{layout.layout_name}</span>
                      {layout.is_active && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">有効</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {layout.grid_rows}行 × {layout.grid_cols}列
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadLayout(layout)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        編集
                      </button>
                      {!layout.is_active && (
                        <button
                          onClick={() => activateLayout(layout.id!)}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        >
                          有効化
                        </button>
                      )}
                      <button
                        onClick={() => deleteLayout(layout.id!)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}