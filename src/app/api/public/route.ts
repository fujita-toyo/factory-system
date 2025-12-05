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
      SELECT 
        e.id as employee_id,
        e.employee_number,
        e.name,
        COALESCE(a.attendance_status, '出勤') as attendance_status,
        asn.workplace_id,
        w.name as workplace_name,
        w.color as workplace_color
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
      LEFT JOIN assignments asn ON e.id = asn.employee_id AND asn.date = $1
      LEFT JOIN workplaces w ON asn.workplace_id = w.id
      WHERE e.employment_status = '在籍' 
        AND e.display_status = '表示'
        AND COALESCE(a.attendance_status, '出勤') = '出勤'
      ORDER BY e.employee_number
    `, [date]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'データ取得エラー' }, { status: 500 });
  }
}