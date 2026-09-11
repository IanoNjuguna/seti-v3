import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seti — Send mobile money from your stablecoin balance',
  description: 'Send money straight to M-Pesa from your USDC or EURC balance, entirely inside WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
