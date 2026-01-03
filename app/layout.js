import './globals.css'

export const metadata = {
  title: 'The Pitch Tracker',
  description: 'Professional Pitching Management for Youth Baseball Coaches',
  manifest: '/manifest.json',
  themeColor: '#1F2937',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pitch Tracker',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body>{children}</body>
    </html>
  )
}