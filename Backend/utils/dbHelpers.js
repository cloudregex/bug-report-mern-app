import { TicketSequence, sequelize } from '../models/index.js';

export const incrementTicketSequence = async (projectId) => {
  return sequelize.transaction(async (transaction) => {
    const [sequence] = await TicketSequence.findOrCreate({
      where: { projectId },
      defaults: { currentNumber: 100 },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    sequence.currentNumber += 1;
    await sequence.save({ transaction });
    return sequence;
  });
};

export const isUniqueConstraintError = (error) =>
  error?.name === 'SequelizeUniqueConstraintError';
