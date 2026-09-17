import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlixMatch — Find something you\'ll both love',
  description: 'Stop scrolling, stop negotiating. Find a movie or show you both want to watch tonight.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'FlixMatch',
    description: 'Finally agree on what to watch tonight.',
    type: 'website',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#090912',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
