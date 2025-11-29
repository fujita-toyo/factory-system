'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Employee {
  id: number;
  employee_number: string;
  name: string;
  position: string | null;
  employment_status: string;
  display_status: string;
}

export default function EmployeesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(data);
  };

  const handleAdd = async () => {
    if (!employeeNumber || !name) {
      alert('社員番号と氏名を入力してください');
      return;
    }

    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_number: employeeNumber, name, position }),
    });

    if (res.ok) {
      setEmployeeNumber('');
      setName('');
      setPosition('');
      fetchEmployees();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`${name}さんを削除しますか？\n※出勤記録や配置情報も全て削除されます`)) return;

    const res = await fetch(`/api/employees?id=${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchEmployees();
    } else {
      const data = await res.json();
      alert(data.error || '削除に失敗しました');
    }
  };

  const handleStatusChange = async (employee: Employee, field: 'employment_status' | 'display_status', value: string) => {
    await fetch('/api/employees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...employee, [field]: value }),
    });
    fetchEmployees();
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
        const [employee_number, name, position] = line.split(',').map(s => s.trim());
        if (employee_number && name) {
          await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_number, name, position: position || null }),
          });
        }
      }

      fetchEmployees();
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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">人員登録</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">新規登録</h2>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="社員番号"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              placeholder="氏名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              placeholder="役職"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
          </div>
          <button
            onClick={handleAdd}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
          >
            追加
          </button>
        </div>

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
          <p className="text-sm text-gray-600 mt-2">形式: 社員番号,氏名,役職</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">人員一覧</h2>
          <div className="space-y-2">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 border rounded-md">
                <div className="flex items-center gap-4 flex-1">
                  <span className="font-semibold w-20">{employee.employee_number}</span>
                  <span className="w-32">{employee.name}</span>
                  <span className="text-gray-600 w-24">{employee.position}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(employee, 'employment_status', employee.employment_status === '在籍' ? '退職' : '在籍')}
                    className={`px-4 py-1 rounded-md ${employee.employment_status === '在籍' ? 'bg-green-500' : 'bg-gray-500'} text-white`}
                  >
                    {employee.employment_status}
                  </button>
                  <button
                    onClick={() => handleStatusChange(employee, 'display_status', employee.display_status === '表示' ? '非表示' : '表示')}
                    className={`px-4 py-1 rounded-md ${employee.display_status === '表示' ? 'bg-blue-500' : 'bg-gray-500'} text-white`}
                  >
                    {employee.display_status}
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id, employee.name)}
                    className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600"
                  >
                    削除
                  </button>
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