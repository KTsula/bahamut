import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contract Transaction Counter',
  description: 'Get the number of transactions for any Ethereum smart contract',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 