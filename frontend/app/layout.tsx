import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import Navbar from '@/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Zach's Organized Runs",
  description: 'Basketball run organizer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored theme before first paint, otherwise light-mode users get a
            dark flash on every navigation. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='light'){document.documentElement.classList.add('light')}}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-court-950 font-sans text-zinc-100">
        {/* Ambient court backdrop: fixed texture + orange glow behind all content */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          <div
            className="ambient-texture absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/bg-texture.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-court-950/70 via-court-950/90 to-court-950" />
          <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-ember-500/10 blur-[140px]" />
        </div>

        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
