import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

function requireAdmin(request: NextRequest): NextResponse | null {
  const auth = verifyAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Authentication required' }, { status: 401 });
  }
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const err = requireAdmin(request);
  if (err) return err;

  try {
    const res = await query(
      `SELECT u.id, u.username, u.name, u.email, u.role_id, u.is_active, u.created_at, u.updated_at,
              r.name as role_name, r.permissions
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );
    return NextResponse.json({ users: res.rows });
  } catch (e) {
    console.error('Users GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const err = requireAdmin(request);
  if (err) return err;

  try {
    const body = await request.json();
    const { username, password, name, role_id, email } = body;

    if (!username || !password || !name || role_id == null) {
      return NextResponse.json(
        { error: 'Missing required fields: username, password, name, role_id' },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(String(password), SALT_ROUNDS);

    const res = await query(
      `INSERT INTO users (username, password_hash, name, email, role_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, email, role_id, is_active, created_at, updated_at`,
      [String(username).trim(), password_hash, String(name).trim(), email?.trim() || null, Number(role_id)]
    );

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({ user: res.rows[0] }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error('Users POST error:', e);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const err = requireAdmin(request);
  if (err) return err;

  try {
    const body = await request.json();
    const { id, name, email, role_id, is_active, password } = body;

    if (id == null) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(String(name).trim());
    }
    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      params.push(email === '' || email === null ? null : String(email).trim());
    }
    if (role_id !== undefined) {
      updates.push(`role_id = $${idx++}`);
      params.push(Number(role_id));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(Boolean(is_active));
    }
    if (password && String(password).length > 0) {
      const password_hash = await bcrypt.hash(String(password), SALT_ROUNDS);
      updates.push(`password_hash = $${idx++}`);
      params.push(password_hash);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(Number(id));

    const res = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, name, email, role_id, is_active, created_at, updated_at`,
      params
    );

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: res.rows[0] });
  } catch (e) {
    console.error('Users PUT error:', e);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const err = requireAdmin(request);
  if (err) return err;

  const auth = verifyAuth(request);
  const targetId = request.nextUrl.searchParams.get('id');

  if (!targetId) {
    return NextResponse.json({ error: 'Missing required query param: id' }, { status: 400 });
  }

  if (String(auth.user?.id) === String(targetId)) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  try {
    const res = await query('DELETE FROM users WHERE id = $1 RETURNING id', [Number(targetId)]);

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Users DELETE error:', e);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
