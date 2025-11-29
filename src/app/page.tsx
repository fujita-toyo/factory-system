import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">工場配置管理システム</h1>
        <p className="text-gray-600 mb-8">管理者の方はログインしてください</p>
        <Link 
          href="/login" 
          className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 inline-block"
        >
          ログイン画面へ
        </Link>
      </div>
    </div>
  );
}