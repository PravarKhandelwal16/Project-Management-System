const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { pool } = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

const BCRYPT_SALT_ROUNDS = 10;

async function seedSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL || process.argv[2] || 'admin@projectmanagement.com').trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || process.argv[3] || 'SuperAdmin123!';
  const fullName = process.env.SUPER_ADMIN_NAME || process.argv[4] || 'System Super Admin';

  const connection = await pool.getConnection();
  try {
    console.log(`[Seed] Checking for Super Admin account: ${email}`);

    const [existing] = await connection.execute(
      'SELECT id, email, role, is_active FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      const user = existing[0];
      await connection.execute(
        'UPDATE users SET role = "super_admin", is_active = 1 WHERE id = ?',
        [user.id]
      );
      console.log(`[Seed] User ${email} (ID: ${user.id}) successfully elevated to 'super_admin' and set active.`);

      await logAuditEvent({
        userId: user.id,
        action: 'SUPER_ADMIN_SEEDED',
        resourceType: 'USER',
        resourceId: user.id,
        details: { action: 'elevated', email },
      });
    } else {
      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      const [result] = await connection.execute(
        'INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, "super_admin", 1)',
        [fullName, email, passwordHash]
      );
      console.log(`[Seed] Super Admin created successfully! ID: ${result.insertId}, Email: ${email}`);

      await logAuditEvent({
        userId: result.insertId,
        action: 'SUPER_ADMIN_SEEDED',
        resourceType: 'USER',
        resourceId: result.insertId,
        details: { action: 'created', email, full_name: fullName },
      });
    }
  } catch (error) {
    console.error('[Seed Error] Failed to seed Super Admin:', error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

seedSuperAdmin();
