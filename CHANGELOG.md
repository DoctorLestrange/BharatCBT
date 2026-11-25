# Changelog

All notable changes to **BharatCBT** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-25

### Added
- **Full TCS iON / Indian Govt CBT Simulator**: Candidate login terminal, 2-step official instructions & palette legend, live exam runner with sectional/composite countdown timers, locked-section progression, 5-state SVG question palette, collapsible sidebar, keyboard shortcuts, Question Paper viewer, Scientific Calculator, Digital Rough Pad, font scaling (`A- / A / A+`), fullscreen toggle, and auto-saved pause/resume sessions.
- **10 Full-Length Official Pattern Mock Exams (`User_Exam_JSONs/`, 1,090 Questions)**:
  - UPSC CSE Prelims GS Paper I (100 Qs, 120 min, `+2 / -0.6667`, 4 options)
  - SSC CGL Tier-I (100 Qs, 60 min, `+2 / -0.50`, 4 options)
  - SSC CHSL (10+2) Tier-I (100 Qs, 60 min, `+2 / -0.50`, 4 options)
  - SSC MTS & Havaldar (90 Qs, 45+45 min sectional, Session I `+3 / 0` & Session II `+3 / -1`, 4 options)
  - IBPS PO Prelims (100 Qs, 20+20+20 min sectional, `+1 / -0.25`, 5 options)
  - SBI PO Prelims (100 Qs, revised 40/30/30 split, 20+20+20 min sectional, `+1 / -0.25`, 5 options)
  - IBPS Clerk (CSA) Prelims (100 Qs, 20+20+20 min sectional, `+1 / -0.25`, 5 options)
  - RRB NTPC CBT-1 (100 Qs, 90 min, `+1 / -0.3333`, 4 options)
  - RRB JE CBT-1 (100 Qs, 90 min, `+1 / -0.3333`, 4 options)
  - RBI Grade B (DR) Phase-I (200 Qs, 25+25+25+45 min sectional, `+1 / -0.25`, 5 options)
- **Rich Question Rendering**: Split-pane Reading Comprehension / Cloze / Data Interpretation / Puzzle passages, bilingual (`en` / `hi`) toggle, KaTeX math rendering, Markdown tables, and XSS-sanitized inline SVG diagrams.
- **Visual Exam Studio & Analytics**: JSON importer with live validation, visual exam builder with official presets, offline `IndexedDB` persistence (`localStorage` fallback), JSON workspace backup/restore, section & topic accuracy breakdowns, solution review, bookmarks with notes, and one-click "Retry Wrong & Skipped Questions" CBT mode.
- **Appearance Personalization**: Light (default) & Dark graphite themes with 8 accent color presets (`Classic CBT Blue`, `Saffron Orange`, `Emerald Green`, `Royal Indigo`, `Violet`, `Teal Cyan`, `Crimson Rose`, `Amber Gold`).
- **Deployment & CI/CD**: Automated GitHub Actions CI (`lint`, `test`, `build`), automated GitHub Pages publishing workflow, Docker/Nginx containerization, and Netlify/Vercel static SPA configs.
