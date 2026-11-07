export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export type PaymentTerms = 'Due on receipt' | 'Net 15' | 'Net 30' | 'Net 60';

export type TeamRole = 'Admin' | 'Accountant' | 'Viewer';

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerID: string;
  status: InvoiceStatus;
  issuedOn: string;
  terms: PaymentTerms;
  lineItems: LineItem[];
  hasTax: boolean;
  note: string;
}

export interface TeamMember {
  email: string;
  role: TeamRole;
  canApproveInvoices: boolean;
  isPending: boolean;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  isConnected: boolean;
}

export interface LedgerlyState {
  userEmail: string | null;
  customers: Customer[];
  invoices: Invoice[];
  team: TeamMember[];
  integrations: Integration[];
}

export interface Toast {
  id: number;
  message: string;
}
