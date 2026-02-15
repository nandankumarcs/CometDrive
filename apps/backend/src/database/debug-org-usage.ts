import { Sequelize } from 'sequelize';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv'; // Use * as dotenv for compatibility

const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Try root .env
  const rootEnv = path.join(__dirname, '../../../../.env');
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  }
}

async function checkUsage() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'comet',
    logging: false,
    // Add SSL options if needed (mirroring verify-files.ts logic but looser)
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const [results] = await sequelize.query(
      'SELECT uuid, name, max_storage, storage_used FROM "organization"',
    );

    console.log('Organizations:', results.length);
    for (const org of results as any[]) {
      console.log(`\nOrganization: ${org.name} (${org.uuid})`);
      console.log(`Max Storage: ${org.max_storage}`);
      console.log(`Storage Used: ${org.storage_used}`);
      const used = parseInt(org.storage_used, 10);
      const max = parseInt(org.max_storage, 10);
      if (max > 0) {
        console.log(`Usage: ${((used / max) * 100).toFixed(2)}%`);
        console.log(`Remaining: ${((max - used) / 1024 / 1024).toFixed(2)} MB`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkUsage();
