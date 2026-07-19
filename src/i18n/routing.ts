import { defineRouting } from "next-intl/routing";
import { defaultLocale, supportedLocales } from "./languages";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: supportedLocales,

  // Used when no locale matches
  defaultLocale: defaultLocale,

  localeDetection: true,

  localePrefix: "as-needed",
});
