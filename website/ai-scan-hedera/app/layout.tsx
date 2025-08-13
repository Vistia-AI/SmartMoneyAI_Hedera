import './globals.css';
import { Inter } from 'next/font/google';
import DonationBanner from './components/DonationBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'VISTIASCANAI - AI Powered Blockchain Exploration',
  description: 'AI-powered blockchain explorer for detailed transaction analysis',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DonationBanner />
        {children}
      </body>
    </html>
  );
}
