import { useState } from 'react';

import { formatMoney, totalInvoice } from '@/ledgerly/data';
import { navigate } from '@/ledgerly/router';
import { useLedgerly } from '@/ledgerly/store';
import { LedgerButton, StatusPill } from '@/ledgerly/ui';

const filters = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'] as const;

export function InvoicesScreen() {
  const { state } = useLedgerly();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [search, setSearch] = useState('');
  const invoices = state.invoices.filter((invoice) => {
    const customer = state.customers.find((candidate) => candidate.id === invoice.customerID);
    const matchesFilter = filter === 'All' || invoice.status === filter;
    const matchesSearch = `${invoice.number} ${customer?.company ?? ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });
  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='text-2xl font-bold'>Invoices</h1>
        <LedgerButton onClick={() => navigate('invoices/new')}>New invoice</LedgerButton>
      </div>
      <div className='flex flex-wrap items-center gap-3'>
        <div
          role='tablist'
          aria-label='Filter invoices'
          className='flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#f1f5f9] p-1'
        >
          {filters.map((name) => (
            <button
              key={name}
              type='button'
              role='tab'
              aria-selected={filter === name}
              onClick={() => setFilter(name)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${filter === name ? 'bg-white shadow-sm' : 'text-[#64748b]'}`}
            >
              {name}
            </button>
          ))}
        </div>
        <input
          aria-label='Search invoices'
          placeholder='Search by number or customer'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className='min-w-0 flex-1 rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm'
        />
      </div>
      <div className='overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white'>
        <table className='w-full text-left text-sm'>
          <thead className='text-[#64748b]'>
            <tr>
              <th className='px-5 py-3 font-semibold'>Invoice</th>
              <th className='px-5 py-3 font-semibold'>Customer</th>
              <th className='px-5 py-3 font-semibold'>Issued</th>
              <th className='px-5 py-3 font-semibold'>Amount</th>
              <th className='px-5 py-3 font-semibold'>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className='border-t border-[#f1f5f9]'>
                <td className='px-5 py-3'>
                  <a href={`#/invoices/${invoice.id}`} className='font-semibold text-[#4338ca] hover:underline'>
                    {invoice.number}
                  </a>
                </td>
                <td className='px-5 py-3'>
                  {state.customers.find((customer) => customer.id === invoice.customerID)?.company}
                </td>
                <td className='px-5 py-3 text-[#64748b]'>{invoice.issuedOn}</td>
                <td className='px-5 py-3 font-semibold'>{formatMoney(totalInvoice(invoice))}</td>
                <td className='px-5 py-3'>
                  <StatusPill status={invoice.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && <p className='p-5 text-sm text-[#64748b]'>No invoices match.</p>}
      </div>
    </div>
  );
}
