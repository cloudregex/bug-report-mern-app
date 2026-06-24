import React from 'react';
import { useOutletContext } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import TicketList from '../components/tickets/TicketList';

export default function Tickets() {
  const { user } = useOutletContext();

  return (
    <PageShell wide title="Tickets">
      <p className="text-sm text-muted-foreground mb-6 -mt-2">Search and filter tickets across your projects</p>
      <TicketList user={user} showProjectColumn />
    </PageShell>
  );
}
