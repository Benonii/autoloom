import type { Invoice, LedgerlyState, LineItem } from '@/ledgerly/types';

export const taxRate = 0.0875;

export const initialState: LedgerlyState = {
  userEmail: null,
  customers: [
    { id: 'northwind', name: 'Priya Raman', company: 'Northwind Studio', email: 'priya@northwind.studio' },
    { id: 'acme', name: 'Marcus Lee', company: 'Acme Robotics', email: 'ap@acmerobotics.com' },
    { id: 'bluebird', name: 'Hana Sato', company: 'Bluebird Coffee', email: 'hana@bluebird.coffee' },
    { id: 'orbit', name: 'Diego Alvarez', company: 'Orbit Health', email: 'billing@orbithealth.io' }
  ],
  invoices: [
    {
      id: 'inv-1042',
      number: 'INV-1042',
      customerID: 'northwind',
      status: 'Paid',
      issuedOn: 'Oct 2',
      terms: 'Net 30',
      lineItems: [{ id: 'a', description: 'Brand workshop', quantity: 1, unitPrice: 4200 }],
      hasTax: false,
      note: ''
    },
    {
      id: 'inv-1043',
      number: 'INV-1043',
      customerID: 'bluebird',
      status: 'Overdue',
      issuedOn: 'Oct 9',
      terms: 'Net 15',
      lineItems: [{ id: 'a', description: 'Menu photography', quantity: 12, unitPrice: 150 }],
      hasTax: true,
      note: ''
    },
    {
      id: 'inv-1044',
      number: 'INV-1044',
      customerID: 'orbit',
      status: 'Sent',
      issuedOn: 'Oct 28',
      terms: 'Net 30',
      lineItems: [{ id: 'a', description: 'Landing page build', quantity: 1, unitPrice: 6800 }],
      hasTax: false,
      note: ''
    }
  ],
  team: [
    { email: 'demo@ledgerly.app', role: 'Admin', canApproveInvoices: true, isPending: false },
    { email: 'jules@ledgerly.app', role: 'Accountant', canApproveInvoices: true, isPending: false }
  ],
  integrations: [
    { id: 'stripe', name: 'Stripe', description: 'Let customers pay invoices by card.', isConnected: false },
    { id: 'quickbooks', name: 'QuickBooks', description: 'Sync paid invoices to your books.', isConnected: false },
    { id: 'slack', name: 'Slack', description: 'Post a message when an invoice is paid.', isConnected: true }
  ]
};

export function sumLineItems(lineItems: LineItem[]): number {
  return lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}

export function totalInvoice(invoice: Pick<Invoice, 'lineItems' | 'hasTax'>): number {
  const subtotal = sumLineItems(invoice.lineItems);
  return invoice.hasTax ? subtotal * (1 + taxRate) : subtotal;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
