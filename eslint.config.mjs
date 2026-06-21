import nextVitals from "eslint-config-next/core-web-vitals.js";

const eslintConfig = [
  ...(Array.isArray(nextVitals) ? nextVitals : [nextVitals]),
  // Override default ignores of eslint-config-next.
  {
    ignores: [
    // Default ignores of eslint-config-next:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
