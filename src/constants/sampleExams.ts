import { DEFAULT_EXAM_SETTINGS } from './examPresets';
import type { ExamDefinition } from '../types/exam';

const NOW = 1762870000000;

export const SAMPLE_EXAMS: ExamDefinition[] = [
  {
    id: 'demo_ssc_cgl_tier1',
    title: 'SSC CGL Tier-I Pattern Mini Mock',
    subtitle: 'Composite Time • Bilingual (EN/HI) • +2 / -0.5',
    category: 'SSC CGL',
    description:
      'Authentic 4-section SSC CGL Tier-I mock test featuring Reasoning, General Awareness, Quantitative Aptitude (with KaTeX formulas & SVG geometry), and English Reading Comprehension.',
    languages: ['en', 'hi'],
    isBuiltIn: true,
    createdAt: NOW,
    updatedAt: NOW,
    instructions: [
      'This mock follows the SSC CGL Tier-I pattern with 4 sections and composite time (no sectional lock).',
      'Each correct answer carries +2 marks and each incorrect answer carries a penalty of -0.5 marks.',
      'Use the "View in" selector to switch between English and Hindi for bilingual questions.',
    ],
    settings: {
      ...DEFAULT_EXAM_SETTINGS,
      durationMinutes: 15,
      sectionalTiming: false,
      defaultMarks: 2,
      defaultNegativeMarks: 0.5,
      evaluateMarkedAnswered: true,
      cutoffPercent: 65,
      showLoginScreen: true,
      showInstructionsScreen: true,
    },
    sections: [
      {
        id: 'ssc_reasoning',
        name: 'General Intelligence & Reasoning',
        questions: [
          {
            id: 'ssc_r1',
            sectionId: 'ssc_reasoning',
            type: 'single',
            topic: 'Number Series',
            difficulty: 'easy',
            question: {
              en: 'Select the number from among the given options that can replace the question mark (?) in the following series:\n\n$5, 11, 24, 51, 106, ?$',
              hi: 'दिए गए विकल्पों में से उस संख्या का चयन करें जो निम्नलिखित श्रृंखला में प्रश्नवाचक चिह्न (?) के स्थान पर आ सकती है:\n\n$5, 11, 24, 51, 106, ?$',
            },
            options: ['215', '217', '219', '221'],
            correctIndices: [1],
            explanation: {
              en: 'Pattern: $\\times 2 + 1, \\times 2 + 2, \\times 2 + 3, \\times 2 + 4, \\times 2 + 5$.\n\n- $5 \\times 2 + 1 = 11$\n- $11 \\times 2 + 2 = 24$\n- $24 \\times 2 + 3 = 51$\n- $51 \\times 2 + 4 = 106$\n- $106 \\times 2 + 5 = 217$',
              hi: 'पैटर्न: $\\times 2 + 1, \\times 2 + 2, \\times 2 + 3, \\times 2 + 4, \\times 2 + 5$।\nअतः $106 \\times 2 + 5 = 217$।',
            },
          },
          {
            id: 'ssc_r2',
            sectionId: 'ssc_reasoning',
            type: 'single',
            topic: 'Coding-Decoding',
            difficulty: 'medium',
            question: {
              en: 'In a certain code language, `MADRAS` is written as `NBESBT`. How will `BOMBAY` be written in that same code language?',
              hi: 'एक निश्चित कूट भाषा में, `MADRAS` को `NBESBT` लिखा जाता है। उसी कूट भाषा में `BOMBAY` को किस प्रकार लिखा जाएगा?',
            },
            options: ['CPNCBZ', 'CPOCBZ', 'DPNCBZ', 'CPNCBX'],
            correctIndices: [0],
            explanation:
              'Each letter shifts forward by $+1$ in the English alphabet: $B\\to C, O\\to P, M\\to N, B\\to C, A\\to B, Y\\to Z$, giving `CPNCBZ`.',
          },
          {
            id: 'ssc_r3',
            sectionId: 'ssc_reasoning',
            type: 'single',
            topic: 'Syllogism',
            difficulty: 'medium',
            question: {
              en: 'Read the given statements and conclusions carefully and decide which of the conclusions logically follow(s).\n\n**Statements:**\n1. All laptops are computers.\n2. Some computers are tablets.\n\n**Conclusions:**\nI. Some laptops are tablets.\nII. All tablets being laptops is a possibility.',
              hi: 'दिए गए कथनों और निष्कर्षों को ध्यानपूर्वक पढ़ें:\n\n**कथन:**\n1. सभी लैपटॉप कंप्यूटर हैं।\n2. कुछ कंप्यूटर टैबलेट हैं।\n\n**निष्कर्ष:**\nI. कुछ लैपटॉप टैबलेट हैं।\nII. सभी टैबलेट के लैपटॉप होने की संभावना है।',
            },
            options: [
              { en: 'Only conclusion I follows', hi: 'केवल निष्कर्ष I अनुसरण करता है' },
              { en: 'Only conclusion II follows', hi: 'केवल निष्कर्ष II अनुसरण करता है' },
              {
                en: 'Both conclusions I and II follow',
                hi: 'निष्कर्ष I और II दोनों अनुसरण करते हैं',
              },
              {
                en: 'Neither conclusion I nor II follows',
                hi: 'न तो निष्कर्ष I और न ही II अनुसरण करता है',
              },
            ],
            correctIndices: [1],
            explanation:
              'There is no definite direct relation between laptops and tablets, so Conclusion I does not definitely follow. However, since no negative restriction exists between tablets and laptops, all tablets being inside laptops is a valid possibility (Conclusion II follows).',
          },
        ],
      },
      {
        id: 'ssc_ga',
        name: 'General Awareness',
        questions: [
          {
            id: 'ssc_g1',
            sectionId: 'ssc_ga',
            type: 'single',
            topic: 'Indian Polity',
            difficulty: 'easy',
            question: {
              en: 'Which Constitutional Amendment Act introduced the Goods and Services Tax (GST) in India?',
              hi: 'भारत में वस्तु एवं सेवा कर (GST) किस संविधान संशोधन अधिनियम द्वारा लागू किया गया था?',
            },
            options: [
              { en: '100th Amendment Act, 2015', hi: '100वां संशोधन अधिनियम, 2015' },
              { en: '101st Amendment Act, 2016', hi: '101वां संशोधन अधिनियम, 2016' },
              { en: '102nd Amendment Act, 2018', hi: '102वां संशोधन अधिनियम, 2018' },
              { en: '104th Amendment Act, 2019', hi: '104वां संशोधन अधिनियम, 2019' },
            ],
            correctIndices: [1],
            explanation:
              'The 101st Constitutional Amendment Act, 2016 introduced GST (Article 246A, GST Council under Article 279A), rolled out nationwide on 1 July 2017.',
          },
          {
            id: 'ssc_g2',
            sectionId: 'ssc_ga',
            type: 'single',
            topic: 'Geography',
            difficulty: 'medium',
            question: {
              en: 'Which river is known as the "Sorrow of Bihar" due to its frequent course changes and devastating floods?',
              hi: 'बार-बार मार्ग बदलने और विनाशकारी बाढ़ के कारण किस नदी को "बिहार का शोक" कहा जाता है?',
            },
            options: [
              { en: 'Son', hi: 'सोन' },
              { en: 'Gandak', hi: 'गंडक' },
              { en: 'Kosi', hi: 'कोसी' },
              { en: 'Damodar', hi: 'दामोदर' },
            ],
            correctIndices: [2],
            explanation:
              'The Kosi River carries heavy silt from Nepal and frequently shifts its channel across the Gangetic plains of northern Bihar.',
          },
          {
            id: 'ssc_g3',
            sectionId: 'ssc_ga',
            type: 'single',
            topic: 'General Science',
            difficulty: 'easy',
            question: {
              en: 'Which vitamin deficiency is the primary cause of pernicious anaemia?',
              hi: 'निम्नलिखित में से किस विटामिन की कमी से पर्निशियस एनीमिया (घातक रक्ताल्पता) होता है?',
            },
            options: [
              { en: 'Vitamin B1 (Thiamine)', hi: 'विटामिन B1 (थायमिन)' },
              { en: 'Vitamin B6 (Pyridoxine)', hi: 'विटामिन B6 (पायरीडॉक्सिन)' },
              { en: 'Vitamin B12 (Cyanocobalamin)', hi: 'विटामिन B12 (साइनोकोबालामिन)' },
              { en: 'Vitamin C (Ascorbic Acid)', hi: 'विटामिन C (एस्कॉर्बिक अम्ल)' },
            ],
            correctIndices: [2],
            explanation:
              'Vitamin B12 (cobalamin) is essential for red blood cell maturation and myelin synthesis; deficiency leads to megaloblastic / pernicious anaemia.',
          },
        ],
      },
      {
        id: 'ssc_quant',
        name: 'Quantitative Aptitude',
        questions: [
          {
            id: 'ssc_q1',
            sectionId: 'ssc_quant',
            type: 'single',
            topic: 'Geometry',
            difficulty: 'medium',
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 170" width="260" height="170">
              <rect width="260" height="170" fill="#F8FAFC" rx="8"/>
              <circle cx="120" cy="85" r="56" fill="none" stroke="#1E3A8A" stroke-width="2.2"/>
              <circle cx="120" cy="85" r="3" fill="#1E3A8A"/>
              <line x1="74" y1="117" x2="166" y2="117" stroke="#0F172A" stroke-width="2"/>
              <line x1="74" y1="117" x2="120" y2="29" stroke="#2563EB" stroke-width="2"/>
              <line x1="166" y1="117" x2="120" y2="29" stroke="#2563EB" stroke-width="2"/>
              <line x1="74" y1="117" x2="120" y2="85" stroke="#DC2626" stroke-width="1.6" stroke-dasharray="4 3"/>
              <line x1="166" y1="117" x2="120" y2="85" stroke="#DC2626" stroke-width="1.6" stroke-dasharray="4 3"/>
              <text x="115" y="76" font-size="13" font-family="Arial" font-weight="bold" fill="#1E3A8A">O</text>
              <text x="115" y="22" font-size="13" font-family="Arial" font-weight="bold" fill="#0F172A">A</text>
              <text x="60" y="124" font-size="13" font-family="Arial" font-weight="bold" fill="#0F172A">B</text>
              <text x="171" y="124" font-size="13" font-family="Arial" font-weight="bold" fill="#0F172A">C</text>
              <text x="106" y="103" font-size="12" font-family="Arial" fill="#DC2626">110°</text>
            </svg>`,
            question: {
              en: 'In the given figure, $O$ is the centre of the circle and chord $BC$ subtends $\\angle BOC = 110^\\circ$ at the centre. If $A$ is a point on the major arc $BC$, find $\\angle BAC$.',
              hi: 'दी गई आकृति में, $O$ वृत्त का केंद्र है और जीवा $BC$ केंद्र पर $\\angle BOC = 110^\\circ$ का कोण बनाती है। यदि $A$ दीर्घ चाप $BC$ पर एक बिंदु है, तो $\\angle BAC$ ज्ञात कीजिए।',
            },
            options: ['$45^\\circ$', '$55^\\circ$', '$70^\\circ$', '$110^\\circ$'],
            correctIndices: [1],
            explanation:
              'By the Inscribed Angle Theorem, the angle subtended by an arc at the centre is double the angle subtended by it at any point on the remaining part of the circle: $\\angle BAC = \\frac{1}{2} \\angle BOC = \\frac{110^\\circ}{2} = 55^\\circ$.',
          },
          {
            id: 'ssc_q2',
            sectionId: 'ssc_quant',
            type: 'single',
            topic: 'Algebra',
            difficulty: 'medium',
            question: {
              en: 'If $x + \\frac{1}{x} = 5$, what is the value of $x^3 + \\frac{1}{x^3}$?',
              hi: 'यदि $x + \\frac{1}{x} = 5$ है, तो $x^3 + \\frac{1}{x^3}$ का मान क्या होगा?',
            },
            options: ['110', '115', '125', '140'],
            correctIndices: [0],
            explanation:
              'Using the identity $x^3 + \\frac{1}{x^3} = \\left(x + \\frac{1}{x}\\right)^3 - 3\\left(x + \\frac{1}{x}\\right) = 5^3 - 3(5) = 125 - 15 = 110$.',
          },
          {
            id: 'ssc_q3',
            sectionId: 'ssc_quant',
            type: 'single',
            topic: 'Time & Work',
            difficulty: 'easy',
            question: {
              en: 'A can complete a piece of work in $12$ days and B can complete the same work in $18$ days. If they work together, in how many days will the work be completed?',
              hi: 'A किसी कार्य को $12$ दिनों में और B उसी कार्य को $18$ दिनों में पूरा कर सकता है। यदि वे दोनों मिलकर कार्य करें, तो कार्य कितने दिनों में पूरा होगा?',
            },
            options: ['$6.4$ days', '$7.2$ days', '$7.5$ days', '$8.0$ days'],
            correctIndices: [1],
            explanation:
              'Let total work = $\\text{LCM}(12, 18) = 36$ units. Efficiency of $A = 3$ units/day, $B = 2$ units/day. Combined efficiency = $5$ units/day. Time = $\\frac{36}{5} = 7.2$ days.',
          },
        ],
      },
      {
        id: 'ssc_english',
        name: 'English Comprehension',
        questions: [
          {
            id: 'ssc_e1',
            sectionId: 'ssc_english',
            type: 'single',
            topic: 'Reading Comprehension',
            difficulty: 'easy',
            passageTitle: 'Directions: Read the passage carefully and answer the questions.',
            passage:
              'India’s Unified Payments Interface (UPI) has emerged as a benchmark in real-time retail payment systems worldwide. Built on open application programming interfaces (APIs), UPI allows seamless interoperability across banks and third-party payment apps. Economists observe that lowering transaction friction has not only encouraged small merchants to adopt digital bookkeeping, but has also broadened formal credit access through verifiable cash-flow trails.',
            question:
              'According to the passage, how has lowering transaction friction benefited small merchants?',
            options: [
              'By eliminating all commercial bank accounts',
              'By encouraging digital bookkeeping and broadening formal credit access',
              'By replacing international wire transfers exclusively',
              'By fixing uniform retail prices across states',
            ],
            correctIndices: [1],
            explanation:
              'The final sentence explicitly notes that lowering transaction friction encouraged small merchants to adopt digital bookkeeping and broadened formal credit access.',
          },
          {
            id: 'ssc_e2',
            sectionId: 'ssc_english',
            type: 'single',
            topic: 'Reading Comprehension',
            difficulty: 'easy',
            passageTitle: 'Directions: Read the passage carefully and answer the questions.',
            passage:
              'India’s Unified Payments Interface (UPI) has emerged as a benchmark in real-time retail payment systems worldwide. Built on open application programming interfaces (APIs), UPI allows seamless interoperability across banks and third-party payment apps. Economists observe that lowering transaction friction has not only encouraged small merchants to adopt digital bookkeeping, but has also broadened formal credit access through verifiable cash-flow trails.',
            question:
              'Which word in the passage is closest in meaning to "seamless compatibility between different systems"?',
            options: ['Friction', 'Benchmark', 'Interoperability', 'Bookkeeping'],
            correctIndices: [2],
            explanation:
              '"Interoperability" refers to the ability of different banks and apps to work together seamlessly.',
          },
          {
            id: 'ssc_e3',
            sectionId: 'ssc_english',
            type: 'single',
            topic: 'Idioms & Phrases',
            difficulty: 'medium',
            question: 'Select the most appropriate meaning of the idiom: **"Burn the midnight oil"**',
            options: [
              'To waste scarce fuel needlessly',
              'To work or study late into the night',
              'To start an argument intentionally',
              'To give up a difficult responsibility',
            ],
            correctIndices: [1],
            explanation:
              '"Burn the midnight oil" means to read, study, or work late into the night.',
          },
        ],
      },
    ],
  },
  {
    id: 'demo_ibps_po_sectional',
    title: 'IBPS PO Prelims Sectional Timer Demo',
    subtitle: 'Sectional Countdown • 5 Options (A–E) • +1 / -0.25',
    category: 'IBPS / Banking',
    description:
      'Experience the strict IBPS/SBI banking CBT interface with 5 options, individual section countdown timers, Data Interpretation tables, and locked section progression.',
    languages: ['en'],
    isBuiltIn: true,
    createdAt: NOW - 86400000,
    updatedAt: NOW - 86400000,
    instructions: [
      'Each section has an independent timer. You cannot switch sections manually before the active section timer ends or you submit the exam.',
      'Each question has 5 options (A to E). Correct answer: +1 mark; Wrong answer: -0.25 marks.',
    ],
    settings: {
      ...DEFAULT_EXAM_SETTINGS,
      durationMinutes: 15,
      sectionalTiming: true,
      allowBackNavigationInSectionalTiming: false,
      defaultMarks: 1,
      defaultNegativeMarks: 0.25,
      evaluateMarkedAnswered: true,
      cutoffPercent: 60,
    },
    sections: [
      {
        id: 'ibps_eng',
        name: 'English Language',
        durationMinutes: 5,
        defaultMarks: 1,
        defaultNegativeMarks: 0.25,
        questions: [
          {
            id: 'ibps_e1',
            sectionId: 'ibps_eng',
            type: 'single',
            topic: 'Error Spotting',
            difficulty: 'medium',
            question:
              'Identify the segment that contains a grammatical error:\n\n"Neither the branch manager (A) / nor the senior clerks (B) / was present at (C) / the audit meeting yesterday. (D) / No error (E)"',
            options: ['Part (A)', 'Part (B)', 'Part (C)', 'Part (D)', 'No error (E)'],
            correctIndices: [2],
            explanation:
              'With "Neither... nor...", the verb agrees with the nearer subject ("the senior clerks", plural). Hence "was present" in Part (C) should be "were present".',
          },
          {
            id: 'ibps_e2',
            sectionId: 'ibps_eng',
            type: 'single',
            topic: 'Cloze / Vocabulary',
            difficulty: 'easy',
            question:
              'Choose the most suitable word to fill the blank:\n\n"The central bank maintained an _______ stance on interest rates to keep inflation under control."',
            options: ['acquiescent', 'accommodative', 'arbitrary', 'ephemeral', 'ambiguous'],
            correctIndices: [1],
            explanation:
              '"Accommodative stance" is standard monetary policy terminology describing a central bank policy stance.',
          },
        ],
      },
      {
        id: 'ibps_quant',
        name: 'Quantitative Aptitude',
        durationMinutes: 5,
        defaultMarks: 1,
        defaultNegativeMarks: 0.25,
        questions: [
          {
            id: 'ibps_q1',
            sectionId: 'ibps_quant',
            type: 'single',
            topic: 'Data Interpretation',
            difficulty: 'medium',
            passageTitle: 'Data Interpretation: Quarterly Loan Disbursements (in ₹ Crores)',
            passage: `Study the following table carefully and answer the questions:

| Bank Branch | Q1 | Q2 | Q3 | Q4 |
| --- | --- | --- | --- | --- |
| Mumbai Main | 120 | 150 | 180 | 150 |
| Delhi CP | 100 | 120 | 140 | 160 |
| Bengaluru Tech | 90 | 110 | 130 | 170 |`,
            question:
              'What is the percentage increase in loan disbursement of **Bengaluru Tech** from Q1 to Q4 (rounded to two decimal places)?',
            options: ['77.78%', '82.45%', '88.89%', '91.12%', '75.00%'],
            correctIndices: [2],
            explanation:
              'Increase = $170 - 90 = 80$. Percentage increase = $\\frac{80}{90} \\times 100 = 88.89\\%$.',
          },
          {
            id: 'ibps_q2',
            sectionId: 'ibps_quant',
            type: 'single',
            topic: 'Data Interpretation',
            difficulty: 'easy',
            passageTitle: 'Data Interpretation: Quarterly Loan Disbursements (in ₹ Crores)',
            passage: `Study the following table carefully and answer the questions:

| Bank Branch | Q1 | Q2 | Q3 | Q4 |
| --- | --- | --- | --- | --- |
| Mumbai Main | 120 | 150 | 180 | 150 |
| Delhi CP | 100 | 120 | 140 | 160 |
| Bengaluru Tech | 90 | 110 | 130 | 170 |`,
            question: 'What is the ratio of total loans disbursed by **Mumbai Main** across all 4 quarters to that of **Delhi CP**?',
            options: ['15 : 13', '14 : 13', '12 : 11', '16 : 13', '5 : 4'],
            correctIndices: [0],
            explanation:
              'Mumbai Main total = $120 + 150 + 180 + 150 = 600$. Delhi CP total = $100 + 120 + 140 + 160 = 520$. Ratio = $600 : 520 = 15 : 13$.',
          },
        ],
      },
      {
        id: 'ibps_reasoning',
        name: 'Reasoning Ability',
        durationMinutes: 5,
        defaultMarks: 1,
        defaultNegativeMarks: 0.25,
        questions: [
          {
            id: 'ibps_r1',
            sectionId: 'ibps_reasoning',
            type: 'single',
            topic: 'Linear Seating',
            difficulty: 'medium',
            passageTitle: 'Seating Arrangement Puzzle',
            passage:
              'Five officers — P, Q, R, S, and T — sit in a straight row facing North (not necessarily in the same order). **R** sits exactly in the middle. **P** sits at one of the extreme ends. **T** sits immediately to the right of **P**. **S** sits immediately to the right of **R**.',
            question: 'Who sits at the extreme right end of the row?',
            options: ['P', 'Q', 'S', 'T', 'Cannot be determined'],
            correctIndices: [1],
            explanation:
              'Middle (3rd) is R. S is immediate right of R (4th). Since P is at an extreme end and T is immediate right of P, P must be 1st (extreme left) and T is 2nd. Remaining Q must be 5th (extreme right). Arrangement: P, T, R, S, Q.',
          },
          {
            id: 'ibps_r2',
            sectionId: 'ibps_reasoning',
            type: 'single',
            topic: 'Inequalities',
            difficulty: 'easy',
            question:
              'Statement: $A > B \\ge C = D < E$\n\nWhich of the following conclusions is definitely true?',
            options: [
              'Only $A > D$',
              'Only $E > C$',
              'Only $B > E$',
              'Both $A > D$ and $E > C$',
              'None is true',
            ],
            correctIndices: [3],
            explanation:
              'From $A > B \\ge C = D$, we definitely get $A > D$. Also $D < E$ and $C = D$ gives $E > C$. Thus both $A > D$ and $E > C$ are definitely true.',
          },
        ],
      },
    ],
  },
  {
    id: 'demo_upsc_gate_mix',
    title: 'UPSC Prelims & GATE MSQ Showcase',
    subtitle: '1/3rd Negative Marking • Scientific Calc • Multi-Select Support',
    category: 'UPSC / GATE',
    description:
      'Demonstrates UPSC CSE multi-statement MCQs (+2 / -0.67) alongside GATE-style Multiple Select Questions (MSQ) with the on-screen Scientific Calculator enabled.',
    languages: ['en'],
    isBuiltIn: true,
    createdAt: NOW - 172800000,
    updatedAt: NOW - 172800000,
    settings: {
      ...DEFAULT_EXAM_SETTINGS,
      durationMinutes: 20,
      sectionalTiming: false,
      defaultMarks: 2,
      defaultNegativeMarks: 0.67,
      showCalculator: true,
      cutoffPercent: 50,
    },
    sections: [
      {
        id: 'upsc_gs',
        name: 'General Studies (UPSC Pattern)',
        defaultMarks: 2,
        defaultNegativeMarks: 0.67,
        questions: [
          {
            id: 'u1',
            sectionId: 'upsc_gs',
            type: 'single',
            topic: 'Modern History',
            difficulty: 'medium',
            question:
              'Consider the following statements regarding the Government of India Act, 1935:\n1. It provided for the establishment of an All-India Federation.\n2. It introduced dyarchy at the provincial level for the first time.\n\nWhich of the statements given above is/are correct?',
            options: ['1 only', '2 only', 'Both 1 and 2', 'Neither 1 nor 2'],
            correctIndices: [0],
            explanation:
              'Statement 1 is correct. Statement 2 is incorrect because the 1935 Act *abolished* dyarchy in the provinces (which had been introduced by the 1919 Act) and proposed dyarchy at the Centre instead.',
          },
          {
            id: 'u2',
            sectionId: 'upsc_gs',
            type: 'single',
            topic: 'Economy',
            difficulty: 'medium',
            question:
              'With reference to the Monetary Policy Committee (MPC) of India, which of the following statements is correct?',
            options: [
              'It consists of 12 members nominated solely by the Ministry of Finance.',
              'It is a 6-member statutory body chaired ex-officio by the RBI Governor.',
              'Its decisions are strictly non-binding recommendations to commercial banks.',
              'It meets only once at the end of every financial year.',
            ],
            correctIndices: [1],
            explanation:
              'Under the amended RBI Act, 1934 (Section 45ZB), the MPC is a 6-member statutory committee (3 RBI + 3 Govt nominees) chaired ex-officio by the Governor of the RBI.',
          },
        ],
      },
      {
        id: 'gate_tech',
        name: 'CS & Aptitude (MSQ + Calc)',
        defaultMarks: 2,
        defaultNegativeMarks: 0,
        questions: [
          {
            id: 'g1',
            sectionId: 'gate_tech',
            type: 'multi',
            topic: 'Algorithms (MSQ)',
            difficulty: 'hard',
            marks: 2,
            negativeMarks: 0,
            question:
              '**[Multiple Select Question — Select ALL correct options]**\n\nWhich of the following sorting algorithms have $O(n \\log n)$ worst-case time complexity?',
            options: ['Merge Sort', 'Quick Sort', 'Heap Sort', 'Insertion Sort'],
            correctIndices: [0, 2],
            explanation:
              'Merge Sort and Heap Sort guarantee $O(n \\log n)$ in the worst case. Standard Quick Sort and Insertion Sort degrade to $O(n^2)$ in the worst case.',
          },
          {
            id: 'g2',
            sectionId: 'gate_tech',
            type: 'single',
            topic: 'Engineering Math',
            difficulty: 'medium',
            marks: 2,
            negativeMarks: 0.67,
            question:
              'Using the on-screen Scientific Calculator if needed, evaluate $\\log_2(1024) + \\sqrt{625}$:',
            options: ['30', '35', '45', '25'],
            correctIndices: [1],
            explanation: '$\\log_2(1024) = 10$ and $\\sqrt{625} = 25$. Therefore $10 + 25 = 35$.',
          },
        ],
      },
    ],
  },
];
