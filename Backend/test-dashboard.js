import { sequelize } from './models/index.js';
import { getProjectDashboard } from './services/analyticsService.js';

async function test() {
  try {
    await sequelize.authenticate();
    console.log('DB Authenticated');
    
    const projectId = '04f63349-004a-4dd2-82d0-2c6e56c7642c';
    const companyId = '6cfe281f-2e96-41b4-a25f-c3549a3ec2f4';
    
    const data = await getProjectDashboard(projectId, companyId);
    console.log('Dashboard Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await sequelize.close();
  }
}

test();
