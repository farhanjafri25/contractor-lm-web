import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Agentation } from '@/components/agentation';
import { ThemeProvider } from 'next-themes';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

function getMetadataBase() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    'https://www.tenurio.com';

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL('https://www.tenurio.com');
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: 'Tenurio - Contractor Access Management',
  description:
    'Automate contractor access with ownership and expiry. No spreadsheets. No blind spots.',
  applicationName: 'Tenurio',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Tenurio - Contractor Access Management',
    description:
      'Automate contractor access with ownership and expiry. No spreadsheets. No blind spots.',
    images: [{ url: '/tenurio-og.webp' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tenurio - Contractor Access Management',
    description:
      'Automate contractor access with ownership and expiry. No spreadsheets. No blind spots.',
    images: ['/tenurio-og.webp'],
  },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f10' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Providers>
            {children}
          </Providers>
          {process.env.NODE_ENV === "development" && <Agentation />}
        </ThemeProvider>
      </body>
    </html>
  );
}
