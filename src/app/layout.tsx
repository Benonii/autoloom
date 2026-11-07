import './globals.css';

import type { LayoutProps } from '@farm.js/core';

export const metadata = {
  title: 'Autoloom',
  description: 'Paste your app link, say what to show, and get a narrated walkthrough video.'
};

export default function RootLayout({ children }: LayoutProps) {
  return children;
}
