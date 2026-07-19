import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { RootProvider } from "fumadocs-ui/provider/next";
import { defineI18nUI } from "fumadocs-ui/i18n";
import { i18n } from "@/lib/i18n";
import { getFumadocsTranslations } from "@/lib/fumadocs-translations";
import { getCanonicalUrl } from "@/utils/helper";
import "../globals.css";
import type { ReactNode } from "react";
import Layout from "@/components/layout";
import { APP_NAME, APP_URL } from "@/constant/app";
import { supportedLocales } from "scripts/constants";
import { TemplateString } from "next/dist/lib/metadata/types/metadata-types";
import env from "@/backend/config/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const { provider } = defineI18nUI(i18n, {
  translations: getFumadocsTranslations(),
});

const getIconImage = (file: string) => {
  return `/favicon/${file}`;
};

export const generateStaticParams = () => {
  return supportedLocales.map((locale) => ({ locale }));
};

const imageUrl = `/image/seo.png`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const languages: Record<string, string> = {};
  for (const lang of i18n.languages) {
    languages[lang] = getCanonicalUrl(lang, "/").toString();
  }

  const title: TemplateString = {
    default: t("title"),
    template: `%s | ${t("title")}`,
  };
  const description = t("description");
  return {
    metadataBase: APP_URL,
    title,
    description,
    keywords: t("keywords")
      .split(",")
      .map((k: string) => k.trim()),
    applicationName: APP_NAME,
    alternates: {
      languages,
      canonical: getCanonicalUrl(locale, "/"),
    },
    icons: {
      icon: [
        {
          url: getIconImage("favicon-16x16.png"),
          type: "image/png",
          sizes: "16x16",
        },
        {
          url: getIconImage("favicon-32x32.png"),
          type: "image/png",
          sizes: "32x32",
        },
        {
          url: getIconImage("android-chrome-192x192.png"),
          type: "image/png",
          sizes: "192x192",
        },
        {
          url: getIconImage("android-chrome-512x512.png"),
          type: "image/png",
          sizes: "512x512",
        },
        {
          url: getIconImage("favicon.ico"),
          type: "image/x-icon",
        },
      ],
      apple: getIconImage("apple-touch-icon.png"),
    },
    openGraph: {
      title,
      description,
      url: APP_URL,
      type: "website",
      siteName: APP_NAME,
      locale,
      images: {
        url: imageUrl,
        alt: description,
        width: 1200,
        height: 630,
        type: "image/webp",
      },
    },
    twitter: {
      card: "summary_large_image",
      title,

      description,
      images: {
        url: imageUrl,
        alt: description,
      },
    },
    robots: {
      index: env.IS_PROD,
      follow: env.IS_PROD,
      googleBot: {
        index: env.IS_PROD,
        follow: env.IS_PROD,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <NextIntlClientProvider messages={messages}>
          <RootProvider i18n={provider(locale)}>
            <Layout>{children}</Layout>
          </RootProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
