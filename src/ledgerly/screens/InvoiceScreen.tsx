import { useState } from 'react';

import { formatMoney, sumLineItems, taxRate, totalInvoice } from '@/ledgerly/data';
import { useLedgerly } from '@/ledgerly/store';
import { LedgerButton, Modal, StatusPill } from '@/ledgerly/ui';

export function InvoiceScreen({ invoiceID }: { invoiceID: string }) {
  const { state, update, notify } = useLedgerly();
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const invoice = state.invoices.find((candidate) => candidate.id === invoiceID);
  if (!invoice) return <p>Invoice not found.</p>;
  const customer = state.customers.find((candidate) => candidate.id === invoice.customerID);
  const subtotal = sumLineItems(invoice.lineItems);

  function markPaid() {
    update((current) => ({
      ...current,
      invoices: current.invoices.map((candidate) =>
        candidate.id === invoiceID ? { ...candidate, status: 'Paid' } : candidate
      )
    }));
    setIsMarkingPaid(false);
    notify(`${invoice?.number} marked as paid`);
  }

  return (
    <div className='flex flex-col gap-5'>
      <p className='text-sm text-[#64748b]'>
        <a href='#/invoices' className='hover:underline'>
          Invoices
        </a>{' '}
        / {invoice.number}
      </p>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='flex items-center gap-3 text-2xl font-bold'>
          {invoice.number} <StatusPill status={invoice.status} />
        </h1>
        {invoice.status !== 'Paid' && invoice.status !== 'Draft' && (
          <LedgerButton variant='secondary' onClick={() => setIsMarkingPaid(true)}>
            Record payment
          </LedgerButton>
        )}
      </div>
      <div className='rounded-2xl border border-[#e2e8f0] bg-white p-6'>
        <p className='text-sm text-[#64748b]'>Billed to</p>
        <p className='font-semibold'>
          {customer?.company}, {customer?.email}
        </p>
        <table className='mt-6 w-full text-sm'>
          <tbody>
            {invoice.lineItems.map((item) => (
              <tr key={item.id} className='border-t border-[#f1f5f9]'>
                <td className='py-2'>{item.description}</td>
                <td className='py-2 text-right text-[#64748b]'>
                  {item.quantity} x {formatMoney(item.unitPrice)}
                </td>
                <td className='py-2 text-right font-semibold'>{formatMoney(item.quantity * item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className='mt-4 flex flex-col items-end gap-1 text-sm'>
          <p>Subtotal {formatMoney(subtotal)}</p>
          {invoice.hasTax && (
            <p>
              Sales tax ({(taxRate * 100).toFixed(2)}%) {formatMoney(subtotal * taxRate)}
            </p>
          )}
          <p className='text-lg font-bold'>Total {formatMoney(totalInvoice(invoice))}</p>
          <p className='text-[#64748b]'>{invoice.terms}</p>
        </div>
      </div>
      {isMarkingPaid && (
        <Modal
          title='Record a payment'
          description={`Mark ${invoice.number} as fully paid.`}
          onClose={() => setIsMarkingPaid(false)}
        >
          <div className='flex justify-end gap-2'>
            <LedgerButton variant='secondary' onClick={() => setIsMarkingPaid(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton onClick={markPaid}>Mark as paid</LedgerButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
