'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  const menuItems = [
    { name: '作業場登録', path: '/workplaces', color: 'bg-blue-500' },
    { name: '人員登録', path: '/employees', color: 'bg-green-500' },
    { name: '出勤登録', path: '/attendance', color: 'bg-yellow-500' },
    { name: '配置登録', path: '/assignment', color: 'bg-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">管理者ダッシュボード</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`${item.color} text-white p-8 rounded-lg shadow-md hover:opacity-90 transition-opacity text-xl font-semibold`}
            >
              {item.name}
            </button>
          ))}
        </div>
        
        <div className="text-center mt-12 flex justify-center gap-4">
          <a href="/public" target="_blank" rel="noopener noreferrer" className="bg-pink-500 text-white px-6 py-3 rounded-md hover:bg-pink-600">
            配置一覧を開く
          </a>
          
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}