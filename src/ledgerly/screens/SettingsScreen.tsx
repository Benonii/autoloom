import { useState } from 'react';

import { useLedgerly } from '@/ledgerly/store';
import { LedgerButton, Modal, StatusPill, TextField } from '@/ledgerly/ui';

import type { Integration, TeamRole } from '@/ledgerly/types';

const tabs = [
  { id: 'team', label: 'Team' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'branding', label: 'Branding' }
];

const roles: { role: TeamRole; description: string }[] = [
  { role: 'Admin', description: 'Everything, including billing and integrations' },
  { role: 'Accountant', description: 'Create, send, and record payments' },
  { role: 'Viewer', description: 'Read only access to invoices' }
];

export function SettingsScreen({ tab }: { tab: string }) {
  return (
    <div className='flex flex-col gap-5'>
      <h1 className='text-2xl font-bold'>Settings</h1>
      <div role='tablist' aria-label='Settings sections' className='flex gap-1 border-b border-[#e2e8f0]'>
        {tabs.map((item) => (
          <a
            key={item.id}
            role='tab'
            aria-selected={tab === item.id}
            href={`#/settings/${item.id}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === item.id ? 'border-[#c2410c] text-[#9a3412]' : 'border-transparent text-[#64748b]'}`}
          >
            {item.label}
          </a>
        ))}
      </div>
      {tab === 'integrations' ? <IntegrationsTab /> : tab === 'branding' ? <BrandingTab /> : <TeamTab />}
    </div>
  );
}

function TeamTab() {
  const { state, update, notify } = useLedgerly();
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('Accountant');
  const [canApproveInvoices, setCanApproveInvoices] = useState(false);

  function sendInvite() {
    if (!email.includes('@')) return;
    update((current) => ({
      ...current,
      team: [...current.team, { email, role, canApproveInvoices, isPending: true }]
    }));
    notify(`Invite sent to ${email}`);
    setIsInviting(false);
    setEmail('');
  }

  return (
    <section className='rounded-2xl border border-[#e2e8f0] bg-white p-5'>
      <div className='mb-3 flex items-center justify-between'>
        <h2 className='font-bold'>Team members</h2>
        <LedgerButton onClick={() => setIsInviting(true)}>Invite member</LedgerButton>
      </div>
      <ul className='divide-y divide-[#f1f5f9]'>
        {state.team.map((member) => (
          <li key={member.email} className='flex items-center justify-between py-3 text-sm'>
            <span className='font-semibold'>{member.email}</span>
            <span className='flex items-center gap-2 text-[#64748b]'>
              {member.role}
              {member.isPending && <StatusPill status='Pending' />}
            </span>
          </li>
        ))}
      </ul>
      {isInviting && (
        <Modal
          title='Invite a team member'
          description='They get an email to join this workspace.'
          onClose={() => setIsInviting(false)}
        >
          <div className='flex flex-col gap-4'>
            <TextField
              label='Email address'
              type='email'
              value={email}
              onChange={setEmail}
              placeholder='name@company.com'
            />
            <div role='radiogroup' aria-label='Role' className='flex flex-col gap-2'>
              {roles.map((option) => (
                <button
                  key={option.role}
                  type='button'
                  role='radio'
                  aria-checked={role === option.role}
                  onClick={() => setRole(option.role)}
                  className={`rounded-xl border p-3 text-left ${role === option.role ? 'border-[#c2410c] bg-[#fff7ed]' : 'border-[#e2e8f0]'}`}
                >
                  <span className='block text-sm font-bold'>{option.role}</span>
                  <span className='block text-xs text-[#64748b]'>{option.description}</span>
                </button>
              ))}
            </div>
            <label className='flex items-center gap-2 text-sm font-medium'>
              <input
                type='checkbox'
                checked={canApproveInvoices}
                onChange={(event) => setCanApproveInvoices(event.target.checked)}
              />
              Can approve invoices over $5,000
            </label>
            <div className='flex justify-end gap-2'>
              <LedgerButton variant='secondary' onClick={() => setIsInviting(false)}>
                Cancel
              </LedgerButton>
              <LedgerButton onClick={sendInvite}>Send invite</LedgerButton>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function IntegrationsTab() {
  const { state, update, notify } = useLedgerly();
  const [connecting, setConnecting] = useState<Integration | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);

  function connect() {
    if (!connecting || !isAgreed) return;
    update((current) => ({
      ...current,
      integrations: current.integrations.map((item) =>
        item.id === connecting.id ? { ...item, isConnected: true } : item
      )
    }));
    notify(`${connecting.name} connected`);
    setConnecting(null);
    setIsAgreed(false);
  }

  return (
    <ul className='grid gap-3 sm:grid-cols-3'>
      {state.integrations.map((integration) => (
        <li key={integration.id} className='flex flex-col gap-3 rounded-2xl border border-[#e2e8f0] bg-white p-5'>
          <div className='flex items-center justify-between'>
            <p className='font-bold'>{integration.name}</p>
            {integration.isConnected && <StatusPill status='Connected' />}
          </div>
          <p className='flex-1 text-sm text-[#64748b]'>{integration.description}</p>
          {!integration.isConnected && (
            <LedgerButton
              variant='secondary'
              aria-label={`Connect ${integration.name}`}
              onClick={() => setConnecting(integration)}
            >
              Connect
            </LedgerButton>
          )}
        </li>
      ))}
      {connecting && (
        <Modal
          title={`Connect ${connecting.name}`}
          description='Ledgerly will be able to read payouts and create payment links.'
          onClose={() => setConnecting(null)}
        >
          <label className='flex items-center gap-2 text-sm font-medium'>
            <input type='checkbox' checked={isAgreed} onChange={(event) => setIsAgreed(event.target.checked)} />I allow
            Ledgerly to access my {connecting.name} account
          </label>
          <div className='mt-5 flex justify-end gap-2'>
            <LedgerButton variant='secondary' onClick={() => setConnecting(null)}>
              Cancel
            </LedgerButton>
            <LedgerButton disabled={!isAgreed} onClick={connect}>
              Authorize
            </LedgerButton>
          </div>
        </Modal>
      )}
    </ul>
  );
}

function BrandingTab() {
  const { notify } = useLedgerly();
  const [businessName, setBusinessName] = useState('Northwind Creative LLC');
  const [footer, setFooter] = useState('Thank you for your business.');
  return (
    <section className='flex max-w-lg flex-col gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5'>
      <TextField label='Business name on invoices' value={businessName} onChange={setBusinessName} />
      <TextField label='Invoice footer' value={footer} onChange={setFooter} />
      <LedgerButton className='self-start' onClick={() => notify('Branding saved')}>
        Save branding
      </LedgerButton>
    </section>
  );
}
