import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import fs from "fs-extra";

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const files = await fs.readdir(`./messages/${locale}`);

  // Filter JSON files and create import promises
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  // Use Promise.all to load all files concurrently
  const messageModules = await Promise.all(
    jsonFiles.map(async (file) => {
      const fileName = file.slice(0, -5); // Remove .json extension
      const jsonModule = await import(`../../messages/${locale}/${file}`);
      return {
        [fileName]: jsonModule.default,
      } as Record<string, string>;
    })
  );

  // Merge all message objects
  const messages = messageModules.reduce(
    (acc, moduleMessages) => ({
      ...acc,
      ...moduleMessages,
    }),
    {} as Record<string, string>
  );

  return {
    locale,
    messages,
  };
});
