import type { Metadata, Viewport } from 'next'
import { Poppins, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'La Cabana El Rubi | Alojamiento en Villarestrepo, Tolima',
  description:
    'Escapate a la tranquilidad en Villarestrepo. Cabañas acogedoras rodeadas de naturaleza en las montanas del Tolima, Colombia. Reserva tu estadia ahora.',
  keywords: [
    'alojamientos en Villarestrepo',
    'cabanas Villarestrepo',
    'hospedaje Tolima',
    'cabaña El Rubi',
    'turismo Villarestrepo',
    'alojamiento montanas Colombia',
  ],
  openGraph: {
    title: 'La Cabana El Rubi | Villarestrepo, Tolima',
    description:
      'Cabanas acogedoras rodeadas de naturaleza en las montanas del Tolima.',
    url: 'https://cabanaelrubi.com',
    siteName: 'La Cabana El Rubi',
    locale: 'es_CO',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#3a6b35',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${poppins.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
