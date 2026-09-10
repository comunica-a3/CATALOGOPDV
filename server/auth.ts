import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';

const SALT_ROUNDS = 10;
const SESSION_TTL_HOURS = 24 * 7; // 7 days

export interface AuthenticatedUser {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
  isTestUser?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  userName: string;
  userRole: string;
  expiresAt: string;
}

/**
 * Hashes a plaintext password using bcrypt
 */
export async function hashPassword(plainText: string): Promise<string> {
  return await bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Compares plaintext password with stored bcrypt hash
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return await bcrypt.compare(plainText, hash);
}

/**
 * Checks if the system has an active administrator configured
 */
export async function hasAdminUser(): Promise<boolean> {
  const admin = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND active = 1"
  );
  return !!admin && Number(admin.count) > 0;
}

/**
 * Ensures the administrator user exists and is properly configured.
 * - Targets existing 'usr-admin-1' (or 'usr-admin' / active ADMIN)
 * - Username: admin
 * - Password initial: admin (hashed securely via bcrypt)
 * - Name: Administrador
 * - Role: ADMIN
 * - Active: 1
 * - must_change_password: 1 (forced change on first login)
 * 
 * If the administrator has already changed password (must_change_password === 0 and password_hash exists),
 * it preserves their existing password and only ensures active/role status.
 */
export async function ensureDefaultAdminUser(): Promise<void> {
  // Check for any existing admin user (prioritizing 'usr-admin-1', then 'usr-admin', then any role='ADMIN')
  const existingAdmin = await db.get<any>(
    "SELECT id, name, username, email, phone, role, password_hash, active, must_change_password FROM users WHERE id IN ('usr-admin-1', 'usr-admin') OR username = 'admin' OR role = 'ADMIN' ORDER BY CASE WHEN id = 'usr-admin-1' THEN 0 WHEN id = 'usr-admin' THEN 1 ELSE 2 END LIMIT 1"
  );

  const passwordHash = await hashPassword('admin');
  const now = new Date().toISOString();

  if (existingAdmin) {
    // If the administrator has already completed the mandatory password change, NEVER reset password!
    if (Number(existingAdmin.must_change_password) === 0 && existingAdmin.password_hash) {
      await db.run(
        `UPDATE users SET 
          username = COALESCE(NULLIF(username, ''), 'admin'),
          role = 'ADMIN',
          active = 1
        WHERE id = ?`,
        [existingAdmin.id]
      );
      return;
    }

    // Otherwise, configure usr-admin-1 with initial recovery credentials (admin / admin, must_change_password = 1)
    await db.run(
      `UPDATE users SET 
        name = COALESCE(NULLIF(name, ''), 'Administrador'),
        username = 'admin',
        role = 'ADMIN',
        password_hash = ?,
        active = 1,
        must_change_password = 1,
        updated_at = ?
      WHERE id = ?`,
      [passwordHash, now, existingAdmin.id]
    );
    console.log(`Configured initial admin credentials (admin / admin, must_change_password = 1) for user ${existingAdmin.id}`);
  } else {
    // No admin exists in table, insert usr-admin-1
    await db.run(
      `INSERT INTO users (
        id, name, username, email, phone, role, password_hash, active, must_change_password, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'usr-admin-1',
        'Administrador',
        'admin',
        'admin@digitalexpress.com.br',
        null,
        'ADMIN',
        passwordHash,
        1,
        1,
        now,
        now,
      ]
    );
    console.log('Created default initial admin user usr-admin-1: admin / admin (must_change_password = 1)');
  }
}

/**
 * Creates a new session token for a user
 */
export async function createSession(user: AuthenticatedUser): Promise<AuthSession> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  // Clean old expired sessions
  await db.run('DELETE FROM sessions WHERE expires_at < ?', [createdAt]);

  await db.run(
    'INSERT INTO sessions (token, user_id, user_name, user_role, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [token, user.id, user.name, user.role, expiresAt, createdAt]
  );

  return {
    token,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    expiresAt,
  };
}

/**
 * Validates a session token
 */
export async function validateSessionToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token) return null;
  const session = await db.get<{ user_id: string; expires_at: string }>(
    'SELECT user_id, expires_at FROM sessions WHERE token = ?',
    [token]
  );

  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    await db.run('DELETE FROM sessions WHERE token = ?', [token]);
    return null;
  }

  const row = await db.get<any>(
    'SELECT * FROM users WHERE id = ? AND active = 1',
    [session.user_id]
  );

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    username: row.username || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    role: row.role,
    active: Number(row.active) === 1,
    mustChangePassword: Number(row.must_change_password) === 1,
    isTestUser: Number(row.is_test_user) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Invalidate a session token
 */
export async function invalidateSession(token: string): Promise<void> {
  if (!token) return;
  await db.run('DELETE FROM sessions WHERE token = ?', [token]);
}

/**
 * Express Request interface augmentation
 */
export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Middleware: extracts and verifies auth token if present
 */
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-session-token']) {
      token = String(req.headers['x-session-token']).trim();
    }

    if (token) {
      const user = await validateSessionToken(token);
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    console.error('Error in authMiddleware:', err);
  }

  next();
}

/**
 * Middleware: requires authenticated user
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Não autorizado. Faça login para continuar.',
      code: 'UNAUTHORIZED',
    });
    return;
  }
  next();
}

/**
 * Middleware: requires ADMIN role
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Não autorizado. Faça login para continuar.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      error: 'Acesso negado. Apenas administradores podem executar esta ação.',
      code: 'FORBIDDEN',
    });
    return;
  }

  next();
}
