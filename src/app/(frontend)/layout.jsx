import React from "react"
import { Cormorant_Garamond, Inter } from "next/font/google"
import Script from "next/script"
import { BodyCustomCode, renderHeadCustomCode } from "@/lib/make-custom-code"
import {
  makeSiteSettings,
  sanitizeHtmlAttribute,
} from "@/lib/make-site-settings"
import "./styles.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["500", "600"],
})

const defaultTitle = "KLEF Academic Registration Portal"
const title = makeSiteSettings.title ?? defaultTitle
const description =
  makeSiteSettings.description ??
  "Built with Next.js, Payload CMS, and Tailwind CSS"
const favicon = "/favicon.png"
const socialImage = makeSiteSettings.openGraph?.image
const googleAnalyticsId = sanitizeHtmlAttribute(
  makeSiteSettings.analytics?.googleAnalyticsId,
)

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title,
  description,
  robots:
    makeSiteSettings.robots?.index === false
      ? { follow: false, index: false }
      : undefined,
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
  openGraph: {
    title,
    description,
    images: socialImage ? [socialImage] : undefined,
  },
  twitter: socialImage
    ? {
        card: "summary_large_image",
        title,
        description,
        images: [socialImage],
      }
    : undefined,
}

export default function RootLayout({ children }) {
  const { customScripts, accessibility } = makeSiteSettings

  return (
    <html
      lang={makeSiteSettings.language ?? "en"}
      className={`${inter.variable} ${cormorant.variable}`}
    >
      <head>
        {renderHeadCustomCode(customScripts?.headStart, "head-start")}
        {googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `}
            </Script>
          </>
        )}
        {renderHeadCustomCode(customScripts?.headEnd, "head-end")}
      </head>
      <body className="antialiased">
        {accessibility?.addBypassLinks && (
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            Skip to content
          </a>
        )}
        <BodyCustomCode
          html={customScripts?.bodyStart}
          position="start"
        />
        {children}
        <BodyCustomCode html={customScripts?.bodyEnd} position="end" />
      </body>
    </html>
  )
}
