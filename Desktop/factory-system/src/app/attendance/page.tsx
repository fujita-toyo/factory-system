'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Employee {
  id: number;
  employee_number: string;
  name: string;
  attendance_status: string;
  shift_type: string;
}

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (date) {
      fetchAttendance();
    }
  }, [date]);

  const fetchAttendance = async () => {
    const res = await fetch(`/api/attendance?date=${date}`);
    const data = await res.json();
    setEmployees(data);
  };

  const handleStatusChange = async (employee: Employee, field: 'attendance_status' | 'shift_type', value: string) => {
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employee.id,
        date,
        attendance_status: field === 'attendance_status' ? value : employee.attendance_status,
        shift_type: field === 'shift_type' ? value : employee.shift_type,
      }),
    });
    fetchAttendance();
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">出勤登録</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-lg font-semibold mb-2">日付選択</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border rounded-md text-lg"
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">従業員一覧</h2>
          <div className="space-y-2">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 border rounded-md">
                <div className="flex items-center gap-4 flex-1">
                  <span className="font-semibold w-20">{employee.employee_number}</span>
                  <span className="w-32">{employee.name}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(employee, 'attendance_status', employee.attendance_status === '出勤' ? '休み' : '出勤')}
                    className={`px-4 py-1 rounded-md ${employee.attendance_status === '出勤' ? 'bg-green-500' : 'bg-red-500'} text-white`}
                  >
                    {employee.attendance_status}
                  </button>
                  <button
                    onClick={() => handleStatusChange(employee, 'shift_type', employee.shift_type === '早番' ? '遅番' : '早番')}
                    className={`px-4 py-1 rounded-md ${employee.shift_type === '早番' ? 'bg-blue-500' : 'bg-purple-500'} text-white`}
                  >
                    {employee.shift_type}
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