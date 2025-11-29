'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Workplace {
  id: number;
  number: number;
  name: string;
  color: string | null;
}

const PRESET_COLORS = [
  { name: '赤', value: '#FF0000' },
  { name: 'ピンク', value: '#FF69B4' },
  { name: 'ローズ', value: '#FF1493' },
  { name: 'サーモンピンク', value: '#FA8072' },
  { name: 'オレンジ', value: '#FF8C00' },
  { name: 'コーラル', value: '#FF7F50' },
  { name: '黄色', value: '#FFD700' },
  { name: 'レモンイエロー', value: '#FFF44F' },
  { name: '黄緑', value: '#9ACD32' },
  { name: 'ライム', value: '#32CD32' },
  { name: '緑', value: '#228B22' },
  { name: 'エメラルド', value: '#50C878' },
  { name: 'ターコイズ', value: '#40E0D0' },
  { name: '水色', value: '#00CED1' },
  { name: 'スカイブルー', value: '#87CEEB' },
  { name: '青', value: '#1E90FF' },
  { name: 'ロイヤルブルー', value: '#4169E1' },
  { name: '紺', value: '#191970' },
  { name: '藍色', value: '#4B0082' },
  { name: '紫', value: '#9370DB' },
  { name: 'バイオレット', value: '#8A2BE2' },
  { name: 'マゼンタ', value: '#FF00FF' },
  { name: '茶色', value: '#8B4513' },
  { name: 'ブラウン', value: '#A0522D' },
  { name: 'ベージュ', value: '#F5DEB3' },
  { name: 'グレー', value: '#808080' },
  { name: 'ライトグレー', value: '#D3D3D3' },
  { name: 'ダークグレー', value: '#404040' },
  { name: '黒', value: '#000000' },
  { name: '白', value: '#FFFFFF' },
];

export default function WorkplacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // 編集用
  const [editingWorkplace, setEditingWorkplace] = useState<Workplace | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchWorkplaces();
  }, []);

  const fetchWorkplaces = async () => {
    const res = await fetch('/api/workplaces');
    const data = await res.json();
    setWorkplaces(data);
  };

  const handleAdd = async () => {
    if (!number || !name) {
      alert('番号と名称を入力してください');
      return;
    }

    const res = await fetch('/api/workplaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: parseInt(number), name, color }),
    });

    if (res.ok) {
      setNumber('');
      setName('');
      setColor('#3B82F6');
      fetchWorkplaces();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleEdit = (workplace: Workplace) => {
    setEditingWorkplace(workplace);
    setEditNumber(workplace.number.toString());
    setEditName(workplace.name);
    setEditColor(workplace.color || '#3B82F6');
  };

  const handleUpdate = async () => {
    if (!editingWorkplace || !editNumber || !editName) {
      alert('番号と名称を入力してください');
      return;
    }

    const res = await fetch('/api/workplaces', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingWorkplace.id,
        number: parseInt(editNumber),
        name: editName,
        color: editColor,
      }),
    });

    if (res.ok) {
      setEditingWorkplace(null);
      fetchWorkplaces();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('削除しますか？')) return;

    await fetch(`/api/workplaces?id=${id}`, {
      method: 'DELETE',
    });

    fetchWorkplaces();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };

  const handleCSVImport = () => {
    if (!csvFile) {
      alert('CSVファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1);

      for (const line of lines) {
        const [number, name] = line.split(',').map(s => s.trim());
        if (number && name) {
          await fetch('/api/workplaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: parseInt(number), name, color: null }),
          });
        }
      }

      fetchWorkplaces();
      setCsvFile(null);
      // ファイル選択をリセット
      const fileInput = document.getElementById('csv-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    };
    reader.readAsText(csvFile, 'UTF-8');
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">作業場登録</h1>

        {/* 新規登録フォーム */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">新規登録</h2>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="番号"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              placeholder="作業場名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-full px-3 py-2 border rounded-md flex items-center justify-between"
                style={{ backgroundColor: color }}
              >
                <span className="text-white font-semibold" style={{ textShadow: '1px 1px 2px black' }}>色を選択</span>
              </button>
              {showColorPicker && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowColorPicker(false)}
                  />
                  <div className="absolute z-20 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-6 w-80">
                    <h3 className="text-sm font-semibold mb-3 text-gray-700">色を選択してください</h3>
                    <div className="grid grid-cols-6 gap-3">
                      {PRESET_COLORS.map((presetColor) => (
                        <div key={presetColor.value} className="flex flex-col items-center">
                          <button
                            onClick={() => {
                              setColor(presetColor.value);
                              setShowColorPicker(false);
                            }}
                            className="w-12 h-12 rounded-lg border-2 border-gray-300 hover:border-gray-600 hover:scale-110 transition-transform shadow-md"
                            style={{ backgroundColor: presetColor.value }}
                            title={presetColor.name}
                          />
                          <span className="text-xs mt-1 text-gray-600 text-center">{presetColor.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
          >
            追加
          </button>
        </div>

        {/* CSV取り込み */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">CSV取り込み</h2>
          <div className="flex items-center gap-4">
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="border rounded-md p-2"
            />
            <button
              onClick={handleCSVImport}
              disabled={!csvFile}
              className={`px-6 py-2 rounded-md font-semibold ${
                csvFile
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              取り込む
            </button>
          </div>
          {csvFile && (
            <p className="text-sm text-green-600 mt-2">
              選択中: {csvFile.name}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-2">形式: 番号,作業場名称</p>
        </div>

        {/* 作業場一覧 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">作業場一覧</h2>
          <div className="space-y-2">
            {workplaces.map((workplace) => (
              <div
                key={workplace.id}
                className="flex items-center justify-between p-4 border rounded-md"
                style={{ borderLeft: `4px solid ${workplace.color || '#ccc'}` }}
              >
                {editingWorkplace?.id === workplace.id ? (
                  // 編集モード
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="number"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      className="w-20 px-2 py-1 border rounded"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                    <div className="relative">
                      <button
                        onClick={() => setShowEditColorPicker(!showEditColorPicker)}
                        className="px-4 py-1 border rounded font-semibold"
                        style={{ backgroundColor: editColor }}
                      >
                        <span className="text-white" style={{ textShadow: '1px 1px 2px black' }}>色</span>
                      </button>
                      {showEditColorPicker && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowEditColorPicker(false)}
                          />
                          <div className="absolute z-20 right-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-6 w-80">
                            <h3 className="text-sm font-semibold mb-3 text-gray-700">色を選択してください</h3>
                            <div className="grid grid-cols-6 gap-3">
                              {PRESET_COLORS.map((presetColor) => (
                                <div key={presetColor.value} className="flex flex-col items-center">
                                  <button
                                    onClick={() => {
                                      setEditColor(presetColor.value);
                                      setShowEditColorPicker(false);
                                    }}
                                    className="w-12 h-12 rounded-lg border-2 border-gray-300 hover:border-gray-600 hover:scale-110 transition-transform shadow-md"
                                    style={{ backgroundColor: presetColor.value }}
                                    title={presetColor.name}
                                  />
                                  <span className="text-xs mt-1 text-gray-600 text-center">{presetColor.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  // 通常表示
                  <div className="flex items-center gap-4">
                    <span className="font-semibold w-12">{workplace.number}</span>
                    <span>{workplace.name}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  {editingWorkplace?.id === workplace.id ? (
                    <>
                      <button
                        onClick={handleUpdate}
                        className="bg-green-500 text-white px-4 py-1 rounded-md hover:bg-green-600"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingWorkplace(null)}
                        className="bg-gray-500 text-white px-4 py-1 rounded-md hover:bg-gray-600"
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(workplace)}
                        className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(workplace.id)}
                        className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600"
                      >
                        削除
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
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