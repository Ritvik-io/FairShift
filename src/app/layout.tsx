import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/lib/data/store';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FairShift — SDG 8 Workforce Fairness & Decent Work Platform',
  description:
    'An accessible workforce fairness platform solving paper registers, unrecorded overtime, anonymous hazard reporting, and fatigue monitoring for construction and university facilities.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100 antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-950 text-slate-100`}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
