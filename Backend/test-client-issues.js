import { sequelize, ClientIssue, User, Project, Ticket } from './models/index.js';

async function test() {
  try {
    await sequelize.authenticate();
    console.log('DB Authenticated');
    
    const count = await ClientIssue.count();
    console.log('Client Issues count:', count);
    
    const issues = await ClientIssue.findAll({
      include: [
        { model: User, as: 'client', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Ticket, as: 'convertedTicket', attributes: ['id', 'ticketNumber'] }
      ]
    });
    console.log('Fetched issues count:', issues.length);
    for (const issue of issues) {
      console.log(`Issue: id=${issue.id}, title=${issue.title}, client=${issue.client?.name}, project=${issue.project?.name}`);
    }
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await sequelize.close();
  }
}

test();
