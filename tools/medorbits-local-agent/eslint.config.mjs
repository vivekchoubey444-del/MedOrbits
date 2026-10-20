import globals from "globals";

export default [
  { ignores: ["node_modules/**", "coverage/**"] },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: { "no-empty": "warn" },
  },
  {
    files: ["server.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {},
  },
];
