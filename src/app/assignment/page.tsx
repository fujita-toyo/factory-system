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
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);

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
  };

  const handleMultipleAssign = async () => {
    if (!selectedWorkplace || selectedEmployees.length === 0) {
      alert('従業員を選択してください');
      return;
    }

    for (const employeeId of selectedEmployees) {
      await handleAssign(employeeId, selectedWorkplace);
    }

    setSelectedEmployees([]);
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
    setSelectedEmployees([]);
    setShowModal(true);
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  // ドラッグ&ドロップ処理
  const handleDragStart = (employee: Employee) => {
    setDraggedEmployee(employee);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (workplaceId: number) => {
    if (draggedEmployee) {
      await handleAssign(draggedEmployee.employee_id, workplaceId);
      setDraggedEmployee(null);
    }
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
          {/* 左側: 未配置の人員 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">未配置の人員</h2>
            <p className="text-sm text-gray-600 mb-3">ドラッグして作業場に配置できます</p>

            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-blue-600">早番</h3>
              <div className="space-y-2">
                {getUnassignedEmployees('早番').map((employee) => (
                  <div
                    key={employee.employee_id}
                    draggable
                    onDragStart={() => handleDragStart(employee)}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-md cursor-move hover:bg-blue-100 transition-colors"
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
                    draggable
                    onDragStart={() => handleDragStart(employee)}
                    className="p-3 bg-purple-50 border border-purple-200 rounded-md cursor-move hover:bg-purple-100 transition-colors"
                  >
                    <div className="font-semibold">{employee.employee_number}</div>
                    <div>{employee.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側: 作業場 */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {workplaces.map((workplace) => (
              <div
                key={workplace.id}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(workplace.id)}
                className="bg-white rounded-lg shadow-md p-4 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
                style={{
                  borderTopWidth: '6px',
                  borderTopStyle: 'solid',
                  borderTopColor: workplace.color || '#ccc',
                }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">
                    {workplace.number}. {workplace.name}
                  </h3>
                  <button
                    onClick={() => openModal(workplace.id)}
                    className="bg-green-500 text-white w-10 h-10 rounded-full hover:bg-green-600 text-xl font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="space-y-2 min-h-[100px]">
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
                  {getAssignedEmployees(workplace.id).length === 0 && (
                    <div className="text-gray-400 text-center py-8">
                      ここにドロップ
                    </div>
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

      {/* モーダル（複数選択） */}
      {showModal && selectedWorkplace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">従業員を選択（複数選択可）</h2>
            <p className="text-sm text-gray-600 mb-4">
              配置する従業員をクリックして選択してください
            </p>

            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-blue-600 flex items-center justify-between">
                <span>早番</span>
                <span className="text-sm text-gray-500">
                  {selectedEmployees.filter(id => 
                    getUnassignedEmployees('早番').some(e => e.employee_id === id)
                  ).length}人選択中
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {getUnassignedEmployees('早番').map((employee) => (
                  <button
                    key={employee.employee_id}
                    onClick={() => toggleEmployeeSelection(employee.employee_id)}
                    className={`text-left p-3 border-2 rounded-md transition-all ${
                      selectedEmployees.includes(employee.employee_id)
                        ? 'bg-blue-100 border-blue-500 shadow-md'
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <div className="font-semibold">{employee.employee_number}</div>
                    <div>{employee.name}</div>
                    {selectedEmployees.includes(employee.employee_id) && (
                      <div className="text-xs text-blue-600 font-semibold mt-1">✓ 選択中</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-purple-600 flex items-center justify-between">
                <span>遅番</span>
                <span className="text-sm text-gray-500">
                  {selectedEmployees.filter(id => 
                    getUnassignedEmployees('遅番').some(e => e.employee_id === id)
                  ).length}人選択中
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {getUnassignedEmployees('遅番').map((employee) => (
                  <button
                    key={employee.employee_id}
                    onClick={() => toggleEmployeeSelection(employee.employee_id)}
                    className={`text-left p-3 border-2 rounded-md transition-all ${
                      selectedEmployees.includes(employee.employee_id)
                        ? 'bg-purple-100 border-purple-500 shadow-md'
                        : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    <div className="font-semibold">{employee.employee_number}</div>
                    <div>{employee.name}</div>
                    {selectedEmployees.includes(employee.employee_id) && (
                      <div className="text-xs text-purple-600 font-semibold mt-1">✓ 選択中</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleMultipleAssign}
                disabled={selectedEmployees.length === 0}
                className={`flex-1 py-3 rounded-md font-semibold ${
                  selectedEmployees.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                配置する ({selectedEmployees.length}人)
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedEmployees([]);
                }}
                className="flex-1 bg-gray-500 text-white py-3 rounded-md hover:bg-gray-600 font-semibold"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}