import type { Metadata } from 'next';
import { libertinusSerif, libertinusSans, firaCode } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Conduit · Platform',
  description: 'Conduit platform console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${libertinusSerif.variable} ${libertinusSans.variable} ${firaCode.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
