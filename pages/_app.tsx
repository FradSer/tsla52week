import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Comic_Neue } from 'next/font/google'
import { Analytics } from "@vercel/analytics/react"

const comicNeue = Comic_Neue({
  subsets: ['latin'],
weight: "700"
})

export default function App({ Component, pageProps }: AppProps) {
  return(
    <main className={comicNeue.className}>
      <Component {...pageProps} / >
      <Analytics />
    </main>
  );
}
