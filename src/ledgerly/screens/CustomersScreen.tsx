import { useState } from 'react';

import { useLedgerly } from '@/ledgerly/store';
import { LedgerButton, Modal, TextField } from '@/ledgerly/ui';

export function CustomersScreen() {
  const { state, update, notify } = useLedgerly();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');

  function addCustomer() {
    if (!name.trim() || !company.trim() || !email.includes('@')) return;
    update((current) => ({
      ...current,
      customers: [...current.customers, { id: crypto.randomUUID(), name, company, email }]
    }));
    notify(`${company} added`);
    setIsAdding(false);
    setName('');
    setCompany('');
    setEmail('');
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='text-2xl font-bold'>Customers</h1>
        <LedgerButton onClick={() => setIsAdding(true)}>Add customer</LedgerButton>
      </div>
      <ul className='grid gap-3 sm:grid-cols-2'>
        {state.customers.map((customer) => (
          <li key={customer.id} className='rounded-2xl border border-[#e2e8f0] bg-white p-5'>
            <p className='font-bold'>{customer.company}</p>
            <p className='text-sm text-[#64748b]'>
              {customer.name}, {customer.email}
            </p>
          </li>
        ))}
      </ul>
      {isAdding && (
        <Modal title='Add a customer' onClose={() => setIsAdding(false)}>
          <div className='flex flex-col gap-3'>
            <TextField label='Contact name' value={name} onChange={setName} />
            <TextField label='Company' value={company} onChange={setCompany} />
            <TextField label='Billing email' type='email' value={email} onChange={setEmail} />
            <div className='mt-2 flex justify-end gap-2'>
              <LedgerButton variant='secondary' onClick={() => setIsAdding(false)}>
                Cancel
              </LedgerButton>
              <LedgerButton onClick={addCustomer}>Save customer</LedgerButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
