import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    console.log('登録リクエスト受信:', username);

    // データベース接続テスト
    const testResult = await pool.query('SELECT NOW()');
    console.log('データベース接続成功:', testResult.rows[0]);

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('パスワードハッシュ化成功');

    // データベースに保存
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    console.log('ユーザー登録成功:', result.rows[0]);

    return NextResponse.json({ 
      success: true, 
      user: result.rows[0] 
    });
  } catch (error: any) {
    console.error('登録エラー詳細:', error);
    console.error('エラーコード:', error.code);
    console.error('エラーメッセージ:', error.message);

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'このユーザー名は既に使用されています' },
        { status: 400 }
      );
    }

    if (error.code === '42P01') {
      return NextResponse.json(
        { error: 'usersテーブルが存在しません。NeonでSQLを実行してください' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `サーバーエラー: ${error.message}` },
      { status: 500 }
    );
  }
}