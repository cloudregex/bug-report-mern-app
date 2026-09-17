import { sequelize } from '../models/index.js';

async function cleanupIndexes() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const tables = ['users', 'projects', 'tickets', 'client_issues', 'project_members', 'comments', 'attachments', 'activities'];

    for (const table of tables) {
      try {
        const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
        console.log(`Table ${table} total index entries:`, indexes.length);

        const indexMap = {};
        for (const idx of indexes) {
          if (!indexMap[idx.Key_name]) {
            indexMap[idx.Key_name] = [];
          }
          indexMap[idx.Key_name].push(idx.Column_name);
        }

        const seenSignatures = new Set();
        for (const [name, columns] of Object.entries(indexMap)) {
          if (name === 'PRIMARY') continue;
          const sig = columns.join(',');
          if (seenSignatures.has(sig) || (name.startsWith('email_') || name.startsWith('email') && name !== 'email')) {
            console.log(`Dropping duplicate/extra index ${name} on ${table} (${sig})`);
            try {
              await sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${name}\``);
            } catch (err) {
              console.warn(`Could not drop ${name}:`, err.message);
            }
          } else {
            seenSignatures.add(sig);
          }
        }
      } catch (tableErr) {
        console.warn(`Error processing table ${table}:`, tableErr.message);
      }
    }

    console.log('Cleanup completed successfully.');
  } catch (err) {
    console.error('Cleanup error:', err);
  } finally {
    await sequelize.close();
  }
}

cleanupIndexes();
