import './global.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'CometDrive — Cloud Storage',
  description:
    'Secure cloud storage for your team. Upload, organise, and share files effortlessly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
