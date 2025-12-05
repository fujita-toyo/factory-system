import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM workplaces ORDER BY number');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'データ取得エラー' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { number, name, color, can_assign = true } = await request.json();
    const result = await pool.query(
      'INSERT INTO workplaces (number, name, color, can_assign) VALUES ($1, $2, $3, $4) RETURNING *',
      [number, name, color || null, can_assign]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'この番号は既に使用されています' }, { status: 400 });
    }
    return NextResponse.json({ error: '登録エラー' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, number, name, color, can_assign } = await request.json();
    const result = await pool.query(
      'UPDATE workplaces SET number = $1, name = $2, color = $3, can_assign = $4 WHERE id = $5 RETURNING *',
      [number, name, color, can_assign, id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: '更新エラー' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await pool.query('DELETE FROM workplaces WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '削除エラー' }, { status: 500 });
  }
}