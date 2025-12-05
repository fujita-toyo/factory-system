import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '日付が必要です' }, { status: 400 });
    }

    // 配置情報を取得
    const result = await pool.query(`
      SELECT 
        e.id as employee_id,
        e.employee_number,
        e.name,
        a.shift_type,
        a.attendance_status,
        w.id as workplace_id,
        w.name as workplace_name,
        w.number as workplace_number,
        w.color as workplace_color,
        asn.id as assignment_id
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

export async function POST(request: Request) {
  try {
    const { employee_id, workplace_id, date } = await request.json();

    // 作業場の配置可否をチェック
    const workplaceCheck = await pool.query(
      'SELECT can_assign FROM workplaces WHERE id = $1',
      [workplace_id]
    );
    
    if (workplaceCheck.rows.length === 0) {
      return NextResponse.json({ error: '作業場が見つかりません' }, { status: 404 });
    }
    
    if (!workplaceCheck.rows[0].can_assign) {
      return NextResponse.json({ error: 'この作業場には配置できません' }, { status: 400 });
    }
    
    // 既存の配置を削除してから新規配置
    await pool.query('DELETE FROM assignments WHERE employee_id = $1 AND date = $2', [employee_id, date]);
    
    const result = await pool.query(
      'INSERT INTO assignments (employee_id, workplace_id, date) VALUES ($1, $2, $3) RETURNING *',
      [employee_id, workplace_id, date]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: '配置登録エラー' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');
    const date = searchParams.get('date');

    await pool.query(
      'DELETE FROM assignments WHERE employee_id = $1 AND date = $2',
      [employee_id, date]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: '削除エラー' }, { status: 500 });
  }
}