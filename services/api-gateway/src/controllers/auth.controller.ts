import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/postgres';

const JWT_SECRET = process.env.JWT_SECRET || 'guardlayer-default-jwt-secret-key';

// POST /auth/register
export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
      code: 'BAD_REQUEST_MISSING_FIELDS',
    });
  }

  try {
    // 1. Check if any admin already exists
    const countResult = await pool.query('SELECT COUNT(*) FROM admin_users');
    const adminCount = parseInt(countResult.rows[0].count, 10);

    if (adminCount > 0) {
      return res.status(403).json({
        error: 'Registration blocked. Admin user already exists.',
        code: 'FORBIDDEN_ADMIN_EXISTS',
      });
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert the first admin
    const insertResult = await pool.query(
      `INSERT INTO admin_users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, hashedPassword]
    );

    const newAdmin = insertResult.rows[0];

    return res.status(201).json({
      message: 'Admin registered successfully',
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        created_at: newAdmin.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error during admin registration:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

// POST /auth/login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
      code: 'BAD_REQUEST_MISSING_FIELDS',
    });
  }

  try {
    // 1. Fetch user by email
    const result = await pool.query(
      'SELECT id, email, password_hash FROM admin_users WHERE email = $1',
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'UNAUTHORIZED_INVALID_CREDENTIALS',
      });
    }

    const admin = result.rows[0];

    // 2. Compare password hash
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'UNAUTHORIZED_INVALID_CREDENTIALS',
      });
    }

    // 3. Update last_login_at timestamp with defensive check for promise/catch
    const loginPromise = pool.query(
      'UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );
    if (loginPromise && typeof loginPromise.catch === 'function') {
      loginPromise.catch(err => console.error('Error updating last_login_at:', err));
    }

    // 4. Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, admin: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
      },
    });
  } catch (error: any) {
    console.error('Error during admin login:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};
