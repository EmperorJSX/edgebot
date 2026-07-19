import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".source/**",
  ]),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          name: "next/link",
          message: "Please import from @/i18n/navigation instead.",
          importNames: ["default"],
        },
        {
          name: "next/navigation",
          message: "Please import from @/i18n/navigation instead.",
          importNames: [
            "redirect",
            "permanentRedirect",
            "useRouter",
            "usePathname",
          ],
        },
        {
          name: "next/router",
          message: "Please import from @/i18n/navigation instead.",
          importNames: ["useRouter"],
        },
      ],
    },
  },
]);

export default eslintConfig;
