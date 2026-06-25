import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'development';

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bug_tracker',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    underscored: true,
    timestamps: true
  }
};

export default {
  development: base,
  production: base,
  test: { ...base, database: process.env.DB_NAME_TEST || 'bug_tracker_test' }
};

export const getDbConfig = () => base;
