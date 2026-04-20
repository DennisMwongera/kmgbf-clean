// import type { Metadata } from 'next'
// import './globals.css'

// export const metadata: Metadata = {
//   title: 'KMGBF Capacity Needs Assessment Tool',
//   description: 'Kunming-Montreal Global Biodiversity Framework – CNA Tool',
// }

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body>{children}</body>
//     </html>
//   )
// }

import type { Metadata } from 'next'
import './globals.css'
import HtmlDir from '@/components/HtmlDir'

export const metadata: Metadata = {
  title: 'KMGBF Capacity Needs Assessment Tool',
  description: 'Kunming-Montreal Global Biodiversity Framework – CNA Tool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <HtmlDir />
        {children}
      </body>
    </html>
  )
}
