import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/layout/Sidebar';
import { ContentArea } from '../components/layout/ContentArea';

export const metadata: Metadata = {
  title: 'MyBudget',
  description: 'Privacy-first envelope budgeting with subscription tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <ContentArea>{children}</ContentArea>
      </body>
    </html>
  );
}
