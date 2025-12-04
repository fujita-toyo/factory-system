import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active');

    let query = 'SELECT * FROM display_layouts';
    if (activeOnly === 'true') {
      query += ' WHERE is_active = true';
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching layouts:', error);
    return NextResponse.json({ error: 'Failed to fetch layouts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { layout_name, grid_rows, grid_cols, layout_config } = await req.json();

    const result = await pool.query(
      'INSERT INTO display_layouts (layout_name, grid_rows, grid_cols, layout_config) VALUES ($1, $2, $3, $4) RETURNING *',
      [layout_name, grid_rows, grid_cols, JSON.stringify(layout_config)]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating layout:', error);
    return NextResponse.json({ error: 'Failed to create layout' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, layout_name, grid_rows, grid_cols, layout_config, is_active } = await req.json();

    if (is_active) {
      await pool.query('UPDATE display_layouts SET is_active = false');
    }

    const result = await pool.query(
      'UPDATE display_layouts SET layout_name = $1, grid_rows = $2, grid_cols = $3, layout_config = $4, is_active = $5 WHERE id = $6 RETURNING *',
      [layout_name, grid_rows, grid_cols, JSON.stringify(layout_config), is_active, id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating layout:', error);
    return NextResponse.json({ error: 'Failed to update layout' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    await pool.query('DELETE FROM display_layouts WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting layout:', error);
    return NextResponse.json({ error: 'Failed to delete layout' }, { status: 500 });
  }
}