import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

// Load env from apps/backend/.env
dotenv.config({ path: path.resolve(__dirname, 'apps/backend/.env') });

const DB_CONFIG = {
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl:
    process.env.DATABASE_SSL_ENABLED === 'true'
      ? { rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true' }
      : undefined,
};

const API_URL = 'http://localhost:3001/api/v1';

async function main() {
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log('✅ Connected to Database');

    // 1. Ensure UserType and Organization exist
    console.log('--- Seeding Data ---');

    await client.query(`
      INSERT INTO user_type (code, name, is_active, created_at, updated_at)
      VALUES ('ADMIN', 'Admin', true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO user_type (code, name, is_active, created_at, updated_at)
      VALUES ('USER', 'User', true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;
    `);

    // Check/Insert Organization
    const orgCheck = await client.query(`SELECT id FROM organization WHERE name = 'Comet Corp'`);
    let orgId: number;

    if (orgCheck.rows.length === 0) {
      const orgRes = await client.query(`
        INSERT INTO organization (name, created_at, updated_at)
        VALUES ('Comet Corp', NOW(), NOW())
        RETURNING id;
      `);
      orgId = orgRes.rows[0].id;
    } else {
      orgId = orgCheck.rows[0].id;
    }
    console.log(`organization_id: ${orgId}`);

    // Get Admin User Type ID
    const userTypeRes = await client.query(`SELECT id FROM user_type WHERE code = 'ADMIN'`);
    const adminTypeId = userTypeRes.rows[0].id;

    // Get USER User Type ID
    const normalUserTypeRes = await client.query(`SELECT id FROM user_type WHERE code = 'USER'`);
    const userTypeUSERId = normalUserTypeRes.rows[0].id;

    // 2. Create Admin User (Clean State)
    const adminEmail = 'admin@comet.com';
    const password = 'password123';
    console.log(`Resetting user: ${adminEmail}`);

    // Cascading delete manually to avoid FK errors
    const userResult = await client.query(`SELECT id FROM "user" WHERE email = $1`, [adminEmail]);
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      await client.query(`DELETE FROM "session" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "invitation" WHERE invited_by = $1`, [userId]);
      await client.query(`DELETE FROM "audit_log" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
    }

    // Hash password dynamically
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert
    await client.query(
      `
      INSERT INTO "user" (first_name, last_name, email, password, organization_id, user_type_id, created_at, updated_at)
      VALUES ('Super', 'Admin', $1, $4, $2, $3, NOW(), NOW())
    `,
      [adminEmail, orgId, adminTypeId, hashedPassword],
    );
    console.log(`✅ Admin user recreated: ${adminEmail} / ${password}`);

    // 3. Login as Admin
    console.log('--- Authentication Flow ---');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: password }),
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    }
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    console.log('✅ Admin Logged In. Token received.');

    // 4. Create Invitation
    const timerStr = Date.now().toString();
    const inviteEmail = `newuser${timerStr}@comet.com`;
    console.log(`Inviting: ${inviteEmail}`);

    const inviteRes = await fetch(`${API_URL}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: inviteEmail, user_type_id: userTypeUSERId }),
    });

    if (!inviteRes.ok) {
      throw new Error(`Invitation failed: ${inviteRes.status} ${await inviteRes.text()}`);
    }
    const inviteData = await inviteRes.json();
    console.log('✅ Invitation created via API.');

    // 5. Get Token from DB
    const dbInviteRes = await client.query(`SELECT token FROM invitation WHERE email = $1`, [
      inviteEmail,
    ]);
    if (dbInviteRes.rows.length === 0) {
      throw new Error('Invitation not found in DB');
    }
    const inviteToken = dbInviteRes.rows[0].token;
    console.log(`✅ Retrieved Invitation Token from DB: ${inviteToken}`);

    // 6. Register with Token
    console.log('--- Register With Token ---');
    const registerRes = await fetch(`${API_URL}/auth/register-with-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: inviteToken,
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
      }),
    });

    if (!registerRes.ok) {
      throw new Error(`Registration failed: ${registerRes.status} ${await registerRes.text()}`);
    }
    const registerData = await registerRes.json();
    console.log('✅ User Registered Successfully.');
    console.log(`User ID: ${registerData.data.user.id}, Email: ${registerData.data.user.email}`);

    // 7. Verify Login with New User
    const newLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, password: 'password123' }),
    });

    if (!newLoginRes.ok) {
      throw new Error(`Login with new user failed: ${newLoginRes.status}`);
    }
    console.log('✅ Login with NEW user successful.');
  } catch (err) {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
