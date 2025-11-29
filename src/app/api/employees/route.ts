import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY employee_number');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'データ取得エラー' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { employee_number, name, position } = await request.json();
    const result = await pool.query(
      'INSERT INTO employees (employee_number, name, position) VALUES ($1, $2, $3) RETURNING *',
      [employee_number, name, position || null]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'この社員番号は既に使用されています' }, { status: 400 });
    }
    return NextResponse.json({ error: '登録エラー' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, employee_number, name, position, employment_status, display_status } = await request.json();
    const result = await pool.query(
      'UPDATE employees SET employee_number = $1, name = $2, position = $3, employment_status = $4, display_status = $5 WHERE id = $6 RETURNING *',
      [employee_number, name, position, employment_status, display_status, id]
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
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '削除エラー' }, { status: 500 });
  }
}