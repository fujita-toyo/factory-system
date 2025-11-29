import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '日付が必要です' }, { status: 400 });
    }

    const result = await pool.query(`
      SELECT e.*, 
             COALESCE(a.attendance_status, '出勤') as attendance_status,
             COALESCE(a.shift_type, '早番') as shift_type,
             a.id as attendance_id
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
      WHERE e.employment_status = '在籍' AND e.display_status = '表示'
      ORDER BY e.employee_number
    `, [date]);

    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'データ取得エラー' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { employee_id, date, attendance_status, shift_type } = await request.json();
    
    const result = await pool.query(`
      INSERT INTO attendance (employee_id, date, attendance_status, shift_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (employee_id, date)
      DO UPDATE SET attendance_status = $3, shift_type = $4
      RETURNING *
    `, [employee_id, date, attendance_status, shift_type]);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: '登録エラー' }, { status: 500 });
  }
}