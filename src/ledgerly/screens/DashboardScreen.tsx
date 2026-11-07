import { formatMoney, totalInvoice } from '@/ledgerly/data';
import { navigate } from '@/ledgerly/router';
import { useLedgerly } from '@/ledgerly/store';
import { LedgerButton, StatusPill } from '@/ledgerly/ui';

export function DashboardScreen() {
  const { state } = useLedgerly();
  const sumByStatus = (status: string) =>
    state.invoices
      .filter((invoice) => invoice.status === status)
      .reduce((total, invoice) => total + totalInvoice(invoice), 0);
  const cards = [
    { label: 'Outstanding', value: formatMoney(sumByStatus('Sent')) },
    { label: 'Overdue', value: formatMoney(sumByStatus('Overdue')) },
    { label: 'Paid this month', value: formatMoney(sumByStatus('Paid')) }
  ];
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='text-2xl font-bold'>Good afternoon</h1>
        <LedgerButton onClick={() => navigate('invoices/new')}>New invoice</LedgerButton>
      </div>
      <div className='grid gap-4 sm:grid-cols-3'>
        {cards.map((card) => (
          <div key={card.label} className='rounded-2xl border border-[#e2e8f0] bg-white p-5'>
            <p className='text-sm text-[#64748b]'>{card.label}</p>
            <p className='mt-1 text-2xl font-bold'>{card.value}</p>
          </div>
        ))}
      </div>
      <section className='rounded-2xl border border-[#e2e8f0] bg-white p-5'>
        <h2 className='mb-3 font-bold'>Recent invoices</h2>
        <ul className='divide-y divide-[#f1f5f9]'>
          {state.invoices
            .slice()
            .reverse()
            .slice(0, 4)
            .map((invoice) => (
              <li key={invoice.id} className='flex items-center justify-between py-3 text-sm'>
                <a href={`#/invoices/${invoice.id}`} className='font-semibold hover:underline'>
                  {invoice.number}
                </a>
                <span className='text-[#64748b]'>
                  {state.customers.find((customer) => customer.id === invoice.customerID)?.company}
                </span>
                <StatusPill status={invoice.status} />
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
