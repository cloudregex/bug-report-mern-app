import { Sequelize } from 'sequelize';
import { getDbConfig } from './database.js';

const dbConfig = getDbConfig();

export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

export default sequelize;
