import { useState } from 'react';

import { navigate, useRoute } from '@/ledgerly/router';
import { CustomersScreen } from '@/ledgerly/screens/CustomersScreen';
import { DashboardScreen } from '@/ledgerly/screens/DashboardScreen';
import { InvoiceScreen } from '@/ledgerly/screens/InvoiceScreen';
import { InvoicesScreen } from '@/ledgerly/screens/InvoicesScreen';
import { NewInvoiceScreen } from '@/ledgerly/screens/NewInvoiceScreen';
import { SettingsScreen } from '@/ledgerly/screens/SettingsScreen';
import { SignInScreen } from '@/ledgerly/screens/SignInScreen';
import { LedgerlyProvider, useLedgerly } from '@/ledgerly/store';

const navigationItems = [
  { route: 'dashboard', label: 'Dashboard' },
  { route: 'invoices', label: 'Invoices' },
  { route: 'customers', label: 'Customers' },
  { route: 'settings/team', label: 'Settings' }
];

function readScreen(route: string) {
  if (route === 'invoices/new') return <NewInvoiceScreen />;
  if (route.startsWith('invoices/')) return <InvoiceScreen invoiceID={route.slice('invoices/'.length)} />;
  if (route === 'invoices') return <InvoicesScreen />;
  if (route === 'customers') return <CustomersScreen />;
  if (route.startsWith('settings')) return <SettingsScreen tab={route.split('/')[1] ?? 'team'} />;
  return <DashboardScreen />;
}

function Shell() {
  const { state, update, toasts, reset } = useLedgerly();
  const route = useRoute();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  if (!state.userEmail) return <SignInScreen />;
  return (
    <div className='flex min-h-dvh bg-[#f8fafc] text-[#0f172a]'>
      <aside className='hidden w-60 shrink-0 flex-col border-r border-[#e2e8f0] bg-white p-4 md:flex'>
        <p className='mb-8 flex items-center gap-2 px-2 text-lg font-extrabold'>
          <span className='grid size-7 place-items-center rounded-lg bg-[#c2410c] text-sm text-white'>L</span>
          Ledgerly
        </p>
        <nav aria-label='Main' className='flex flex-col gap-1'>
          {navigationItems.map((item) => {
            const isActive = route === item.route || route.startsWith(`${item.route.split('/')[0]}`);
            return (
              <a
                key={item.route}
                href={`#/${item.route}`}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-[#fff7ed] text-[#9a3412]' : 'text-[#475569] hover:bg-[#f1f5f9]'}`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </aside>
      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex items-center justify-between gap-4 border-b border-[#e2e8f0] bg-white px-4 py-3 sm:px-6'>
          <nav aria-label='Mobile' className='flex min-w-0 gap-3 overflow-x-auto text-sm font-semibold md:hidden'>
            {navigationItems.map((item) => (
              <a key={item.route} href={`#/${item.route}`}>
                {item.label}
              </a>
            ))}
          </nav>
          <p className='hidden text-sm text-[#64748b] md:block'>Northwind Creative LLC</p>
          <div className='relative'>
            <button
              type='button'
              aria-haspopup='menu'
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className='flex items-center gap-2 rounded-full border border-[#e2e8f0] py-1 pl-1 pr-3 text-sm font-semibold'
            >
              <span className='grid size-7 place-items-center rounded-full bg-[#fed7aa] text-[#7c2d12]'>D</span>
              Account
            </button>
            {isMenuOpen && (
              <div
                role='menu'
                className='absolute right-0 z-30 mt-2 w-48 rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-lg'
              >
                <button
                  type='button'
                  role='menuitem'
                  className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f1f5f9]'
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('settings/integrations');
                  }}
                >
                  Integrations
                </button>
                <button
                  type='button'
                  role='menuitem'
                  className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f1f5f9]'
                  onClick={() => {
                    setIsMenuOpen(false);
                    reset();
                  }}
                >
                  Reset demo data
                </button>
                <button
                  type='button'
                  role='menuitem'
                  className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f1f5f9]'
                  onClick={() => update((current) => ({ ...current, userEmail: null }))}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className='mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6'>{readScreen(route)}</main>
      </div>
      <div aria-live='polite' className='fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2'>
        {toasts.map((toast) => (
          <p
            key={toast.id}
            role='status'
            className='rounded-xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white shadow-xl'
          >
            {toast.message}
          </p>
        ))}
      </div>
    </div>
  );
}

export function LedgerlyApp() {
  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}>
      <LedgerlyProvider>
        <Shell />
      </LedgerlyProvider>
    </div>
  );
}
