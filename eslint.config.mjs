import next from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "supabase/**", "public/**"],
  },
];

export default eslintConfig;
