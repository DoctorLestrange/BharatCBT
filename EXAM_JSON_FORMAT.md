# BharatCBT Exam JSON Format Specification

BharatCBT accepts **three flexible JSON shapes**:
1. **Simple Exam Object** (`{ title, durationMinutes, ..., questions: [...] }`)
2. **Full Multi-Section Exam Object** (`{ title, ..., sections: [...] }`)
3. **Raw Array of Questions** (`[ { question, options, correctIndex }, ... ]`)

---

## 1. Quick Flat Format (Easiest)

```json
{
  "title": "SSC CGL Tier-I Practice Set",
  "category": "SSC CGL",
  "durationMinutes": 60,
  "defaultMarks": 2,
  "defaultNegativeMarks": 0.5,
  "questions": [
    {
      "id": "q1",
      "section": "Quantitative Aptitude",
      "topic": "Percentage",
      "difficulty": "easy",
      "question": "If $25\\%$ of a number is $45$, find $40\\%$ of that number.",
      "options": ["64", "72", "80", "90"],
      "correctIndex": 1,
      "explanation": "Number = $45 \\times \\frac{100}{25} = 180$. Hence $40\\%$ of $180 = 72$."
    }
  ]
}
```

---

## 2. Full Multi-Section CBT Format (Bilingual, Passages, Sectional Timers)

```json
{
  "title": "IBPS PO Prelims Full Mock",
  "subtitle": "All India CBT Pattern",
  "category": "IBPS / Banking",
  "durationMinutes": 60,
  "sectionalTiming": true,
  "evaluateMarkedAnswered": true,
  "defaultMarks": 1,
  "defaultNegativeMarks": 0.25,
  "passages": {
    "rc_1": {
      "title": "Directions: Read the passage carefully.",
      "content": "India's digital public infrastructure..."
    }
  },
  "sections": [
    {
      "id": "eng",
      "name": "English Language",
      "durationMinutes": 20,
      "questions": [
        {
          "id": "e1",
          "passageId": "rc_1",
          "topic": "Reading Comprehension",
          "question": "What is the main theme of the passage?",
          "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
          "correctOption": "B",
          "explanation": "Explained in the opening paragraph."
        }
      ]
    },
    {
      "id": "quant",
      "name": "Quantitative Aptitude",
      "durationMinutes": 20,
      "questions": [
        {
          "id": "m1",
          "question": {
            "en": "Find the value of $\\sqrt{625} + 15$.",
            "hi": "$\\sqrt{625} + 15$ का मान ज्ञात कीजिए।"
          },
          "options": {
            "en": ["30", "35", "40", "45", "50"],
            "hi": ["30", "35", "40", "45", "50"]
          },
          "correctIndex": 2,
          "marks": 1,
          "negativeMarks": 0.25,
          "explanation": "$25 + 15 = 40$."
        }
      ]
    }
  ]
}
```

---

## 3. Question Field Reference

| Field | Accepted Type | Notes |
|---|---|---|
| `question` | `string \| { en, hi }` | Supports `$...$` inline LaTeX, `$$...$$` display math, `**bold**`, `` `code` ``, and Markdown tables. |
| `options` | `string[] \| { en: string[], hi?: string[] }` | 2 to 8 choices. |
| `correctIndex` | `number` (0-based) | `0` = Option A, `1` = Option B, etc. |
| `correctOption` | `"A".."H"` | Alternative to `correctIndex`. |
| `correctIndices` | `number[]` | For Multiple Select Questions (`"type": "multi"`). |
| `type` | `"single" \| "multi"` | Defaults to `"single"`. |
| `marks` | `number` | Optional per-question positive marks override. |
| `negativeMarks` | `number` | Optional per-question deduction magnitude (e.g. `0.5` subtracts `0.5`). |
| `passage` / `passageId` | `string \| { en, hi }` | Renders a split-pane Comprehension / DI view alongside the question. |
| `svg` / `image` | `string` | Inline SVG string (rendered safely as image) or image URL / data URI. |
| `topic` | `string` | Used for post-exam topic-wise accuracy analytics. |
| `difficulty` | `"easy" \| "medium" \| "hard"` | Optional difficulty tag. |
| `explanation` | `string \| { en, hi }` | Shown in Solution Review after submission. |
