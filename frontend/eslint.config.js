const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const reactRefresh = require("eslint-plugin-react-refresh");

module.exports = [
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        browser: true,
        es2020: true,
        node: true,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "no-undef": "warn",
      "no-unused-vars": "warn",
      "no-console": "warn",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "warn",
      "no-lonely-if": "warn",
      "no-trailing-spaces": "warn",
      "no-multi-spaces": "warn",
      "no-multiple-empty-lines": ["warn", { max: 1 }],
      "space-before-blocks": ["warn", "always"],
      "object-curly-spacing": ["warn", "always"],
      indent: ["warn", 2],
      semi: ["warn", "never"],
      quotes: ["warn", "single"],
      "array-bracket-spacing": ["warn", "never"],
      "linebreak-style": "off",
      "no-unexpected-multiline": "warn",
      "keyword-spacing": ["warn", { before: true, after: true }],
      "comma-dangle": "warn",
      "comma-spacing": "warn",
      "arrow-spacing": "warn",
    },
  },
];
