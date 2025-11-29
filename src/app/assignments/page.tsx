'use client';

import { useState, useEffect } from 'react';
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
}

export default function AssignmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchWorkplaces();
  }, []);

  useEffect(() => {
    if (date) {
      fetchAssignments();
    }
  }, [date]);

  const fetchWorkplaces = async () => {
    const res = await fetch('/api/workplaces');
    const data = await res.json();
    setWorkplaces(data);
  };

  const fetchAssignments = async () => {
    const res = await fetch(`/api/assignments?date=${date}`);
    const data = await res.json();
    setEmployees(data);
  };

  const handleAssign = async (employeeId: number, workplaceId: number) => {
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        workplace_id: workplaceId,
        date,
      }),
    });
    fetchAssignments();
    setShowModal(false);
  };

  const handleRemove = async (employeeId: number) => {
    await fetch(`/api/assignments?employee_id=${employeeId}&date=${date}`, {
      method: 'DELETE',
    });
    fetchAssignments();
  };

  const getUnassignedEmployees = (shiftType: string) => {
    return employees.filter(
      (e) => !e.workplace_id && e.shift_type === shiftType
    );
  };

  const getAssignedEmployees = (workplaceId: number) => {
    return employees.filter((e) => e.workplace_id === workplaceId);
  };

  const openModal = (workplaceId: number) => {
    setSelectedWorkplace(workplaceId);
    setShowModal(true);
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">配置登録</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-lg font-semibold mb-2">日付選択</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border rounded-md text-lg"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">未配置の人員</h2>

            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-blue-600">早番</h3>
              <div className="space-y-2">
                {getUnassignedEmployees('早番').map((employee) => (
                  <div
                    key={employee.employee_id}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-md"
                  >
                    <div className="font-semibold">{employee.employee_number}</div>
                    <div>{employee.name}</div>
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
                    className="p-3 bg-purple-50 border border-purple-200 rounded-md"
                  >
                    <div className="font-semibold">{employee.employee_number}</div>
                    <div>{employee.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {workplaces.map((workplace) => (
              <div
                key={workplace.id}
                className="bg-white rounded-lg shadow-md p-4"
                style={{
                  borderTop: `4px solid ${workplace.color || '#ccc'}`,
                }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">
                    {workplace.number}. {workplace.name}
                  </h3>
                  <button
                    onClick={() => openModal(workplace.id)}
                    className="bg-green-500 text-white w-8 h-8 rounded-full hover:bg-green-600"
                  >
                    +
                  </button>
                </div>
                <div className="space-y-2">
                  {getAssignedEmployees(workplace.id).map((employee) => (
                    <div
                      key={employee.employee_id}
                      className="p-2 bg-gray-50 border rounded-md flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-sm">
                          {employee.employee_number}
                        </div>
                        <div className="text-sm">{employee.name}</div>
                        <div className="text-xs text-gray-500">
                          {employee.shift_type}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(employee.employee_id)}
                        className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600"
                      >
                        削除
                      </button>
                    </div>
                  ))}
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

      {showModal && selectedWorkplace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">従業員を選択</h2>

            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-blue-600">早番</h3>
              {getUnassignedEmployees('早番').map((employee) => (
                <button
                  key={employee.employee_id}
                  onClick={() => handleAssign(employee.employee_id, selectedWorkplace)}
                  className="w-full text-left p-3 mb-2 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  <div className="font-semibold">{employee.employee_number}</div>
                  <div>{employee.name}</div>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-purple-600">遅番</h3>
              {getUnassignedEmployees('遅番').map((employee) => (
                <button
                  key={employee.employee_id}
                  onClick={() => handleAssign(employee.employee_id, selectedWorkplace)}
                  className="w-full text-left p-3 mb-2 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
                >
                  <div className="font-semibold">{employee.employee_number}</div>
                  <div>{employee.name}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}