import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MyBudget',
  description: 'Privacy-first envelope budgeting with subscription tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#1A1A2E', color: '#FFFFFF', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
