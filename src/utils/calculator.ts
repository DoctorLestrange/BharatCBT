export type AngleMode = 'DEG' | 'RAD';

interface Token {
  type: 'num' | 'op' | 'fn' | 'lparen' | 'rparen';
  value: string;
}

const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'log', 'log10', 'log2', 'ln', 'sqrt', 'abs']);
const ZERO_EPSILON = 1e-12;

function toRadians(value: number, angleMode: AngleMode): number {
  return angleMode === 'DEG' ? (value * Math.PI) / 180 : value;
}

function cleanNearZero(value: number): number {
  return Math.abs(value) < ZERO_EPSILON ? 0 : value;
}

function isRightAngleOddMultiple(deg: number): boolean {
  const normalized = ((deg % 180) + 180) % 180;
  return Math.abs(normalized - 90) < 1e-9;
}

function isFlatAngleMultiple(deg: number): boolean {
  const normalized = ((deg % 180) + 180) % 180;
  return normalized < 1e-9 || Math.abs(normalized - 180) < 1e-9;
}

function tokenizeExpression(raw: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1;
      continue;
    }

    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let numStr = '';
      let dotCount = 0;
      while (i < raw.length && ((raw[i] >= '0' && raw[i] <= '9') || raw[i] === '.')) {
        if (raw[i] === '.') {
          dotCount += 1;
          if (dotCount > 1) throw new Error('Invalid number');
        }
        numStr += raw[i];
        i += 1;
      }
      if (numStr === '.') throw new Error('Invalid number');
      // Support scientific notation like 1e-5 or 2.5E+3
      if (i < raw.length && (raw[i] === 'e' || raw[i] === 'E')) {
        const nextCh = raw[i + 1];
        const nextNextCh = raw[i + 2];
        const isSignedExp =
          (nextCh === '+' || nextCh === '-') &&
          nextNextCh !== undefined &&
          nextNextCh >= '0' &&
          nextNextCh <= '9';
        const isUnsignedExp = nextCh !== undefined && nextCh >= '0' && nextCh <= '9';
        if (isSignedExp || isUnsignedExp) {
          numStr += raw[i];
          i += 1;
          if (raw[i] === '+' || raw[i] === '-') {
            numStr += raw[i];
            i += 1;
          }
          while (i < raw.length && raw[i] >= '0' && raw[i] <= '9') {
            numStr += raw[i];
            i += 1;
          }
        }
      }
      tokens.push({ type: 'num', value: numStr });
      continue;
    }

    if (ch === 'π') {
      tokens.push({ type: 'num', value: String(Math.PI) });
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i += 1;
      continue;
    }

    if ('+-*/^%×÷−'.includes(ch)) {
      const normalized = ch === '×' ? '*' : ch === '÷' ? '/' : ch === '−' ? '-' : ch;
      tokens.push({ type: 'op', value: normalized });
      i += 1;
      continue;
    }

    if (ch === '√') {
      tokens.push({ type: 'fn', value: 'sqrt' });
      i += 1;
      continue;
    }

    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      let ident = '';
      while (
        i < raw.length &&
        ((raw[i] >= 'a' && raw[i] <= 'z') || (raw[i] >= 'A' && raw[i] <= 'Z'))
      ) {
        ident += raw[i].toLowerCase();
        i += 1;
      }
      // Support log2 and log10 function identifiers
      if (ident === 'log' && raw.slice(i, i + 2) === '10') {
        ident = 'log10';
        i += 2;
      } else if (ident === 'log' && raw[i] === '2' && raw[i + 1] === '(') {
        ident = 'log2';
        i += 1;
      }
      if (ident === 'pi') {
        tokens.push({ type: 'num', value: String(Math.PI) });
      } else if (ident === 'e') {
        tokens.push({ type: 'num', value: String(Math.E) });
      } else if (FUNCTIONS.has(ident)) {
        tokens.push({ type: 'fn', value: ident });
      } else {
        throw new Error(`Unknown identifier: ${ident}`);
      }
      continue;
    }

    throw new Error(`Unexpected character: ${ch}`);
  }

  // Insert implicit multiplication tokens for natural calculator input:
  // e.g., 2π, 2(3), (2)(3), (2)3, 2sin(30), π(2)
  const expanded: Token[] = [];
  for (let idx = 0; idx < tokens.length; idx += 1) {
    const curr = tokens[idx];
    const prev = expanded[expanded.length - 1];
    if (prev) {
      const prevEndsValue = prev.type === 'num' || prev.type === 'rparen';
      const currStartsValue = curr.type === 'num' || curr.type === 'lparen' || curr.type === 'fn';
      if (prevEndsValue && currStartsValue) {
        expanded.push({ type: 'op', value: '*' });
      }
    }
    expanded.push(curr);
  }

  return expanded;
}

/**
 * Safe recursive-descent scientific expression evaluator (no eval / Function).
 * Precedence (lowest to highest):
 *   1. Additive (+, -)
 *   2. Multiplicative (*, /, %)
 *   3. Unary (+, -)  -> ensures -2^2 === -4 while 2^-3 === 0.125
 *   4. Power (^) right-associative -> 2^3^2 === 512
 *   5. Function calls (sin, cos, tan, log, ln, sqrt, abs)
 *   6. Primary (number, parenthesized expression)
 */
export function evaluateCalculatorExpression(expr: string, angleMode: AngleMode): number {
  const trimmed = expr.trim();
  if (!trimmed) return 0;

  const tokens = tokenizeExpression(trimmed);
  if (tokens.length === 0) return 0;

  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token => tokens[pos++];

  const parseExpression = (): number => {
    let left = parseTerm();
    while (peek()?.type === 'op' && (peek()!.value === '+' || peek()!.value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parseUnary();
    while (
      peek()?.type === 'op' &&
      (peek()!.value === '*' || peek()!.value === '/' || peek()!.value === '%')
    ) {
      const op = consume().value;
      const right = parseUnary();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      } else {
        if (right === 0) throw new Error('Modulo by zero');
        left %= right;
      }
    }
    return left;
  };

  const parseUnary = (): number => {
    if (peek()?.type === 'op' && peek()!.value === '+') {
      consume();
      return parseUnary();
    }
    if (peek()?.type === 'op' && peek()!.value === '-') {
      consume();
      return -parseUnary();
    }
    return parsePower();
  };

  const parsePower = (): number => {
    const base = parsePrimary();
    if (peek()?.type === 'op' && peek()!.value === '^') {
      consume();
      // Right-associative and allows unary exponent (e.g., 2^-3, 2^3^2)
      const exp = parseUnary();
      return Math.pow(base, exp);
    }
    return base;
  };

  const applyFunction = (fn: string, arg: number): number => {
    switch (fn) {
      case 'sin':
        if (angleMode === 'DEG' && isFlatAngleMultiple(arg)) return 0;
        return cleanNearZero(Math.sin(toRadians(arg, angleMode)));
      case 'cos':
        if (angleMode === 'DEG' && isRightAngleOddMultiple(arg)) return 0;
        return cleanNearZero(Math.cos(toRadians(arg, angleMode)));
      case 'tan': {
        if (angleMode === 'DEG') {
          if (isRightAngleOddMultiple(arg)) throw new Error('Undefined tangent');
          if (isFlatAngleMultiple(arg)) return 0;
        } else {
          if (Math.abs(Math.cos(arg)) < ZERO_EPSILON) throw new Error('Undefined tangent');
        }
        return cleanNearZero(Math.tan(toRadians(arg, angleMode)));
      }
      case 'log':
      case 'log10':
        if (arg <= 0) throw new Error('Logarithm domain error');
        return Math.log10(arg);
      case 'log2':
        if (arg <= 0) throw new Error('Logarithm domain error');
        return Math.log2(arg);
      case 'ln':
        if (arg <= 0) throw new Error('Logarithm domain error');
        return Math.log(arg);
      case 'sqrt':
        if (arg < 0) throw new Error('Square root of negative number');
        return Math.sqrt(arg);
      case 'abs':
        return Math.abs(arg);
      default:
        throw new Error(`Unknown function: ${fn}`);
    }
  };

  const parsePrimary = (): number => {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end of expression');

    if (tok.type === 'num') {
      consume();
      const value = Number(tok.value);
      if (!Number.isFinite(value)) throw new Error('Invalid number');
      return value;
    }

    if (tok.type === 'fn') {
      const fn = consume().value;
      let arg: number;
      if (peek()?.type === 'lparen') {
        consume();
        arg = parseExpression();
        if (peek()?.type !== 'rparen') throw new Error('Missing closing parenthesis');
        consume();
      } else {
        arg = parseUnary();
      }
      return applyFunction(fn, arg);
    }

    if (tok.type === 'lparen') {
      consume();
      const val = parseExpression();
      if (peek()?.type !== 'rparen') throw new Error('Missing closing parenthesis');
      consume();
      return val;
    }

    throw new Error('Syntax error');
  };

  const result = parseExpression();
  if (pos < tokens.length) throw new Error('Unexpected trailing input');
  if (!Number.isFinite(result)) throw new Error('Result out of range');
  return Object.is(result, -0) ? 0 : result;
}

export function formatCalculatorResult(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  const normalized = Object.is(value, -0) ? 0 : value;
  const rounded = Math.round(normalized * 1e10) / 1e10;
  const finalVal = Object.is(rounded, -0) ? 0 : rounded;
  if (Math.abs(finalVal) > 1e12 || (Math.abs(finalVal) > 0 && Math.abs(finalVal) < 1e-8)) {
    return finalVal.toExponential(6);
  }
  return String(finalVal);
}
