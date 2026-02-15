import { Sequelize } from 'sequelize';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

// Load env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function main() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    logging: false,
    dialectOptions:
      process.env.DATABASE_SSL_ENABLED === 'true'
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
            },
          }
        : undefined,
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB');

    // Check if user exists
    const [users] = await sequelize.query(
      `SELECT * FROM "user" WHERE email = 'test@crownstack.com'`,
    );
    if (users.length > 0) {
      console.log('ℹ️ User test@crownstack.com already exists.');
      return;
    }

    // Get default organization
    const [orgs] = await sequelize.query(`SELECT * FROM "organization" LIMIT 1`);
    if (orgs.length === 0) {
      console.error('❌ No organization found. Run seeds first.');
      return;
    }
    const orgId = (orgs[0] as any).id;

    // Get ADMIN user type
    const [types] = await sequelize.query(`SELECT * FROM "user_type" WHERE code = 'ADMIN'`);
    if (types.length === 0) {
      console.error('❌ ADMIN user type not found.');
      return;
    }
    const userTypeId = (types[0] as any).id;

    // Hash password
    const password = 'Password123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await sequelize.query(
      `
            INSERT INTO "user" (
                first_name, last_name, email, password,
                organization_id, user_type_id,
                created_at, updated_at
            ) VALUES (
                'Test', 'User', 'test@crownstack.com', :password,
                :orgId, :userTypeId,
                NOW(), NOW()
            )
        `,
      {
        replacements: {
          password: hashedPassword,
          orgId,
          userTypeId,
        },
      },
    );

    console.log('✅ Created user: test@crownstack.com / Password123!');
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await sequelize.close();
  }
}

main();
