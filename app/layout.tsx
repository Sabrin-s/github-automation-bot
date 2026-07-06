import type { Metadata } from 'next';
import './globals.css';
import AnimatedCursor from '@/components/AnimatedCursor';

export const metadata: Metadata = {
  title: 'GitPulse | Event-Driven GitHub Automation Bot',
  description: 'Manage repository workflows with custom triggers, Slack webhooks, and Google Gemini AI code analysis.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AnimatedCursor />
        {children}
      </body>
    </html>
  );
}
