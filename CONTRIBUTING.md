# Contributing to BharatCBT

Thank you for contributing to BharatCBT! Contributions that improve CBT simulation fidelity, accessibility, exam JSON verification, or the mock library in `User_Exam_JSONs/` are very welcome.

## Development Setup

1. Ensure **Node.js 20+** (Node 22 recommended; see `.nvmrc`) is installed.
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```

## Required Verification Before Opening a PR

Run all three checks cleanly from the repository root:

```bash
npm run lint   # TypeScript typecheck (tsc --noEmit)
npm test       # Vitest unit & User_Exam_JSONs verification suite
npm run build  # Typecheck + production bundle build into dist/
```

## Contributing Mock Exam JSON Files

1. Follow the schema in [`EXAM_JSON_FORMAT.md`](./EXAM_JSON_FORMAT.md) and place new `.json` files inside [`User_Exam_JSONs/`](./User_Exam_JSONs).
2. Ensure strict JSON validity (`JSON.parse` compatible — double-escape LaTeX backslashes like `\\frac`, `\\times`, `\\%`).
3. Keep currency symbols (`₹`) **outside** `$...$` math blocks, and wrap literal `$` characters inside backticks (e.g., `` `$` ``) so KaTeX renders cleanly without warnings.
4. Provide accurate `correctIndex` / answer keys, `topic`, `difficulty` (`easy` / `medium` / `hard`), and clear step-by-step `explanation` text for every question.
5. Update `src/__tests__/userExamLoader.test.ts` if you add a new bundled exam file or modify an existing exam's official question count, duration, or section rules, then verify `npm test` passes with zero errors and zero warnings.

## Code Style & Guidelines

- Keep TypeScript `strict` clean with zero unused locals or parameters.
- Support both **Light** and **Dark** themes as well as dynamic accent colors (use Tailwind's mapped `orange-*` accent tokens paired with appropriate `dark:` classes and accessible contrast).
- Keep all toolbars single-line and responsive across desktop (`1024px+`) and mobile viewports.
- Never execute arbitrary user HTML/scripts — keep SVG rendering routed through the existing `sanitizeSvg` helper in `src/components/common/MathText.tsx`.
