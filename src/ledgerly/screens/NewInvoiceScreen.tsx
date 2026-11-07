import { useState } from 'react';

import { formatMoney, sumLineItems, taxRate } from '@/ledgerly/data';
import { navigate } from '@/ledgerly/router';
import { useLedgerly } from '@/ledgerly/store';
import { LedgerButton, Modal } from '@/ledgerly/ui';

import type { Invoice, InvoiceStatus, LineItem, PaymentTerms } from '@/ledgerly/types';

const termOptions: PaymentTerms[] = ['Due on receipt', 'Net 15', 'Net 30', 'Net 60'];

function createLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 };
}

export function NewInvoiceScreen() {
  const { state, update, notify } = useLedgerly();
  const [customerID, setCustomerID] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([createLineItem()]);
  const [terms, setTerms] = useState<PaymentTerms>('Net 30');
  const [hasTax, setHasTax] = useState(false);
  const [note, setNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [message, setMessage] = useState('Thanks for working with us. Your invoice is attached.');
  const [errorMessage, setErrorMessage] = useState('');
  const customer = state.customers.find((candidate) => candidate.id === customerID);
  const matches = state.customers.filter((candidate) =>
    `${candidate.company} ${candidate.name}`.toLowerCase().includes(customerSearch.toLowerCase())
  );
  const filledItems = lineItems.filter((item) => item.description.trim() && item.unitPrice > 0);
  const subtotal = sumLineItems(filledItems);
  const nextNumber = `INV-${1042 + state.invoices.length}`;

  function changeItem(id: string, change: Partial<LineItem>) {
    setLineItems((items) => items.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }

  function save(status: InvoiceStatus) {
    if (!customer) return setErrorMessage('Choose a customer first.');
    if (filledItems.length === 0) return setErrorMessage('Add at least one line item with a price.');
    const invoice: Invoice = {
      id: nextNumber.toLowerCase(),
      number: nextNumber,
      customerID: customer.id,
      status,
      issuedOn: 'Today',
      terms,
      lineItems: filledItems,
      hasTax,
      note
    };
    update((current) => ({ ...current, invoices: [...current.invoices, invoice] }));
    notify(status === 'Sent' ? `${nextNumber} sent to ${customer.email}` : `${nextNumber} saved as a draft`);
    navigate('invoices');
  }

  function review() {
    if (!customer) return setErrorMessage('Choose a customer first.');
    if (filledItems.length === 0) return setErrorMessage('Add at least one line item with a price.');
    setErrorMessage('');
    setIsReviewing(true);
  }

  return (
    <div className='flex flex-col gap-5'>
      <p className='text-sm text-[#64748b]'>
        <a href='#/invoices' className='hover:underline'>
          Invoices
        </a>{' '}
        / New
      </p>
      <h1 className='text-2xl font-bold'>New invoice {nextNumber}</h1>
      <section className='rounded-2xl border border-[#e2e8f0] bg-white p-5'>
        <h2 className='mb-3 font-bold'>Customer</h2>
        {customer ? (
          <div className='flex items-center justify-between rounded-xl bg-[#eef2ff] p-3'>
            <div>
              <p className='font-semibold'>{customer.company}</p>
              <p className='text-sm text-[#475569]'>
                {customer.name}, {customer.email}
              </p>
            </div>
            <LedgerButton variant='ghost' onClick={() => setCustomerID(null)}>
              Change customer
            </LedgerButton>
          </div>
        ) : (
          <div className='relative'>
            <input
              role='combobox'
              aria-expanded={isPickerOpen}
              aria-controls='customer-options'
              aria-label='Search customers'
              placeholder='Search customers'
              value={customerSearch}
              onFocus={() => setIsPickerOpen(true)}
              onChange={(event) => {
                setCustomerSearch(event.target.value);
                setIsPickerOpen(true);
              }}
              className='w-full rounded-lg border border-[#cbd5e1] px-3 py-2'
            />
            {isPickerOpen && (
              <ul
                id='customer-options'
                role='listbox'
                className='absolute z-20 mt-1 w-full rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-lg'
              >
                {matches.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type='button'
                      role='option'
                      aria-selected={false}
                      onClick={() => {
                        setCustomerID(candidate.id);
                        setIsPickerOpen(false);
                      }}
                      className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f1f5f9]'
                    >
                      <span className='font-semibold'>{candidate.company}</span>{' '}
                      <span className='text-[#64748b]'>{candidate.name}</span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && <li className='px-3 py-2 text-sm text-[#64748b]'>No customers found</li>}
              </ul>
            )}
          </div>
        )}
      </section>
      <section className='rounded-2xl border border-[#e2e8f0] bg-white p-5'>
        <h2 className='mb-3 font-bold'>Line items</h2>
        <div className='flex flex-col gap-3'>
          {lineItems.map((item, index) => (
            <div key={item.id} className='grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]'>
              <label className='col-span-2 text-xs font-medium text-[#475569] sm:col-span-1'>
                Item {index + 1} description
                <input
                  value={item.description}
                  onChange={(event) => changeItem(item.id, { description: event.target.value })}
                  className='mt-1 w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm'
                />
              </label>
              <label className='text-xs font-medium text-[#475569]'>
                Item {index + 1} quantity
                <input
                  type='number'
                  min={1}
                  value={item.quantity || ''}
                  onChange={(event) => changeItem(item.id, { quantity: Number(event.target.value) || 0 })}
                  className='mt-1 w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm'
                />
              </label>
              <label className='text-xs font-medium text-[#475569]'>
                Item {index + 1} price
                <input
                  type='number'
                  min={0}
                  value={item.unitPrice || ''}
                  onChange={(event) => changeItem(item.id, { unitPrice: Number(event.target.value) || 0 })}
                  className='mt-1 w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm'
                />
              </label>
              <LedgerButton
                variant='ghost'
                aria-label={`Remove item ${index + 1}`}
                disabled={lineItems.length === 1}
                onClick={() => setLineItems((items) => items.filter((candidate) => candidate.id !== item.id))}
              >
                Remove
              </LedgerButton>
            </div>
          ))}
        </div>
        <LedgerButton
          variant='secondary'
          className='mt-4'
          onClick={() => setLineItems((items) => [...items, createLineItem()])}
        >
          Add line item
        </LedgerButton>
      </section>
      <section className='grid gap-5 rounded-2xl border border-[#e2e8f0] bg-white p-5 md:grid-cols-2'>
        <div>
          <h2 className='mb-3 font-bold'>Payment terms</h2>
          <div role='radiogroup' aria-label='Payment terms' className='flex flex-wrap gap-2'>
            {termOptions.map((option) => (
              <button
                key={option}
                type='button'
                role='radio'
                aria-checked={terms === option}
                onClick={() => setTerms(option)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${terms === option ? 'border-[#4f46e5] bg-[#eef2ff] text-[#4338ca]' : 'border-[#e2e8f0]'}`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className='mt-5 flex items-center gap-3'>
            <button
              type='button'
              role='switch'
              aria-checked={hasTax}
              aria-label='Add sales tax'
              onClick={() => setHasTax(!hasTax)}
              className={`relative h-6 w-11 rounded-full transition-colors ${hasTax ? 'bg-[#4f46e5]' : 'bg-[#cbd5e1]'}`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${hasTax ? 'left-[1.375rem]' : 'left-0.5'}`}
              />
            </button>
            <span className='text-sm font-semibold'>Add sales tax ({(taxRate * 100).toFixed(2)}%)</span>
          </div>
        </div>
        <label className='flex flex-col gap-1.5 text-sm font-medium text-[#334155]'>
          Note to customer
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            className='rounded-lg border border-[#cbd5e1] px-3 py-2'
          />
        </label>
      </section>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-lg font-bold'>Total {formatMoney(hasTax ? subtotal * (1 + taxRate) : subtotal)}</p>
        <div className='flex gap-2'>
          <LedgerButton variant='secondary' onClick={() => save('Draft')}>
            Save draft
          </LedgerButton>
          <LedgerButton onClick={review}>Review and send</LedgerButton>
        </div>
      </div>
      {errorMessage && (
        <p role='alert' className='text-sm font-semibold text-[#b91c1c]'>
          {errorMessage}
        </p>
      )}
      {isReviewing && customer && (
        <Modal
          title={`Send ${nextNumber}`}
          description={`To ${customer.name} at ${customer.email}`}
          onClose={() => setIsReviewing(false)}
          isWide
        >
          <ul className='mb-4 divide-y divide-[#f1f5f9] text-sm'>
            {filledItems.map((item) => (
              <li key={item.id} className='flex justify-between py-2'>
                <span>
                  {item.description} x {item.quantity}
                </span>
                <span className='font-semibold'>{formatMoney(item.quantity * item.unitPrice)}</span>
              </li>
            ))}
          </ul>
          <p className='mb-4 text-right font-bold'>
            {terms}, total {formatMoney(hasTax ? subtotal * (1 + taxRate) : subtotal)}
          </p>
          <label className='flex flex-col gap-1.5 text-sm font-medium text-[#334155]'>
            Email message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              className='rounded-lg border border-[#cbd5e1] px-3 py-2'
            />
          </label>
          <div className='mt-5 flex justify-end gap-2'>
            <LedgerButton variant='secondary' onClick={() => setIsReviewing(false)}>
              Back to editing
            </LedgerButton>
            <LedgerButton onClick={() => save('Sent')}>Send invoice</LedgerButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
