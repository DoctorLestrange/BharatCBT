# Security Policy

## Architecture & Data Privacy

BharatCBT is a 100% client-side static Single Page Application with **no backend server, no user accounts, and no telemetry or analytics**:

- Exam definitions, attempt history, paused sessions, bookmarks, and candidate profile preferences stay strictly on the user's device inside `IndexedDB` and `localStorage`.
- Bundled mock papers in `User_Exam_JSONs/` are compiled at build time and verified locally during startup.
- Inline mathematical notation is rendered via KaTeX, and user-provided inline `<svg>` diagrams are sanitized through the DOM sanitizer in `src/components/common/MathText.tsx` (stripping `<script>`, `<foreignObject>`, inline event handlers, and unsafe URIs).
- Workspace backups are exported/imported locally as explicit user-initiated `.json` files.

## Supported Versions

Security fixes apply to the latest release on the default branch.

## Reporting a Vulnerability

If you discover a security issue (such as an XSS vector in SVG/math rendering, unsafe JSON parsing behavior, or dependency vulnerability):

1. **Do not** disclose exploit details publicly in a public issue before maintainers can review and patch it.
2. Open a private **GitHub Security Advisory** on the repository (or contact the repository maintainer directly with reproduction steps and affected file paths).
3. Include a minimal JSON/input snippet demonstrating the issue so it can be verified and patched quickly.
