/**
 * Math Problem Generator
 *
 * Generates Problem objects on-the-fly from a GradeConfig.
 * Each problem includes a question string, correct answer, operands,
 * and displayTokens for 3D / 2D rendering.
 */

import type {
  Grade,
  GradeConfig,
  Problem,
  ProblemTypeConfig,
  NumberRange,
  DisplayToken,
  Operation,
} from './types';
import { GRADE_CONFIGS } from './commonCoreStandards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a simple UUID-v4-style ID (no crypto dependency needed). */
function generateId(): string {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

/** Return a random integer in [min, max] (inclusive). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Return a random float in [min, max], rounded to `decimalPlaces`. */
function randFloat(min: number, max: number, decimalPlaces: number): number {
  const value = Math.random() * (max - min) + min;
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

/** Generate a random number from a NumberRange config. */
function randomFromRange(range: NumberRange): number {
  if (range.allowDecimals) {
    return randFloat(range.min, range.max, range.decimalPlaces ?? 2);
  }
  return randInt(range.min, range.max);
}

/** Pick a random item from an array weighted by a `weight` property. */
function weightedPick(types: ProblemTypeConfig[]): ProblemTypeConfig {
  const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * totalWeight;
  for (const t of types) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return types[types.length - 1];
}

/** Round a number for display (avoid floating-point artefacts). */
function round(n: number, places = 4): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Format a number for display (strip unnecessary trailing zeros). */
function fmt(n: number): string {
  return Number.isInteger(n) ? n.toString() : parseFloat(n.toFixed(4)).toString();
}

/** Greatest common divisor (for fraction simplification & ratios). */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Token builders
// ---------------------------------------------------------------------------

function numToken(value: number | string): DisplayToken {
  return { type: 'number', value: String(value) };
}

function symToken(value: string): DisplayToken {
  return { type: 'symbol', value };
}

function fractionToken(numerator: number | string, denominator: number | string): DisplayToken {
  return { type: 'fraction', numerator: String(numerator), denominator: String(denominator) };
}

function exponentToken(base: number | string, power: number | string): DisplayToken {
  return { type: 'exponent', base: String(base), power: String(power) };
}

function sqrtToken(radicand: number | string): DisplayToken {
  return { type: 'sqrt', radicand: String(radicand) };
}

// ---------------------------------------------------------------------------
// Problem generators per operation
// ---------------------------------------------------------------------------

type ProblemBuilder = (config: ProblemTypeConfig, grade: Grade) => Problem;

function buildCounting(config: ProblemTypeConfig, grade: Grade): Problem {
  const n = randomFromRange(config.operandRanges[0]);
  const next = n + 1;
  return {
    id: generateId(),
    grade,
    operation: config.operation,
    question: `What number comes after ${n}?`,
    correctAnswer: next,
    tolerance: 0,
    operands: [n],
    displayTokens: [numToken(n), symToken(','), symToken('?')],
    hint: `Count one more from ${n}.`,
  };
}

function buildAddition(config: ProblemTypeConfig, grade: Grade): Problem {
  const count = config.operandCount ?? 2;
  const operands: number[] = [];
  for (let i = 0; i < count; i++) {
    operands.push(randomFromRange(config.operandRanges[Math.min(i, config.operandRanges.length - 1)]));
  }
  const answer = round(operands.reduce((s, v) => s + v, 0));
  const tokens: DisplayToken[] = [];
  operands.forEach((op, i) => {
    if (i > 0) tokens.push(symToken('+'));
    tokens.push(numToken(fmt(op)));
  });
  tokens.push(symToken('='), symToken('?'));
  return {
    id: generateId(),
    grade,
    operation: config.operation,
    question: `${operands.map(fmt).join(' + ')} = ?`,
    correctAnswer: answer,
    tolerance: answer % 1 !== 0 ? 0.01 : 0,
    operands,
    displayTokens: tokens,
  };
}

function buildSubtraction(config: ProblemTypeConfig, grade: Grade): Problem {
  let a = randomFromRange(config.operandRanges[0]);
  let b = randomFromRange(config.operandRanges[1]);
  // Ensure non-negative result for lower grades
  if (['K', '1', '2', '3', '4', '5'].includes(grade) && a < b) {
    [a, b] = [b, a];
  }
  const answer = round(a - b);
  return {
    id: generateId(),
    grade,
    operation: config.operation,
    question: `${fmt(a)} − ${fmt(b)} = ?`,
    correctAnswer: answer,
    tolerance: answer % 1 !== 0 ? 0.01 : 0,
    operands: [a, b],
    displayTokens: [numToken(fmt(a)), symToken('−'), numToken(fmt(b)), symToken('='), symToken('?')],
  };
}

function buildMultiplication(config: ProblemTypeConfig, grade: Grade): Problem {
  const a = randomFromRange(config.operandRanges[0]);
  const b = randomFromRange(config.operandRanges[1]);
  const answer = round(a * b);
  return {
    id: generateId(),
    grade,
    operation: config.operation,
    question: `${fmt(a)} × ${fmt(b)} = ?`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [a, b],
    displayTokens: [numToken(fmt(a)), symToken('×'), numToken(fmt(b)), symToken('='), symToken('?')],
  };
}

function buildDivision(config: ProblemTypeConfig, grade: Grade): Problem {
  // Generate divisor and quotient, then compute dividend = divisor × quotient
  // This guarantees an integer answer for lower grades.
  const divisor = randomFromRange(config.operandRanges[0]);
  const quotient = randomFromRange(config.operandRanges[1]);
  const dividend = divisor * quotient;
  return {
    id: generateId(),
    grade,
    operation: config.operation,
    question: `${dividend} ÷ ${divisor} = ?`,
    correctAnswer: quotient,
    tolerance: 0,
    operands: [dividend, divisor],
    displayTokens: [numToken(dividend), symToken('÷'), numToken(divisor), symToken('='), symToken('?')],
    hint: `Think: ${divisor} × ? = ${dividend}`,
  };
}

function buildFractions(config: ProblemTypeConfig, grade: Grade): Problem {
  const num1 = randomFromRange(config.operandRanges[0]);
  const denom = Math.max(2, randomFromRange(config.operandRanges[1]));

  // For grade 4: addition with same denominator
  if (grade === '4') {
    const num2 = randInt(1, denom - 1);
    const ansNum = num1 + num2;
    const g = gcd(ansNum, denom);
    const answer = round(ansNum / denom);
    return {
      id: generateId(),
      grade,
      operation: 'fractions',
      question: `${num1}/${denom} + ${num2}/${denom} = ?`,
      correctAnswer: answer,
      tolerance: 0.001,
      operands: [num1, num2, denom],
      displayTokens: [
        fractionToken(num1, denom),
        symToken('+'),
        fractionToken(num2, denom),
        symToken('='),
        symToken('?'),
      ],
      hint: `Add the numerators: ${num1} + ${num2} = ${ansNum}. Simplify ${ansNum}/${denom}${g > 1 ? ` = ${ansNum / g}/${denom / g}` : ''}.`,
    };
  }

  // For grade 5: multiplication of fractions
  if (grade === '5' && config.label.includes('multiplication')) {
    const num2 = randInt(1, 8);
    const denom2 = Math.max(2, randInt(2, 10));
    const answer = round((num1 * num2) / (denom * denom2));
    return {
      id: generateId(),
      grade,
      operation: 'fractions',
      question: `${num1}/${denom} × ${num2}/${denom2} = ?`,
      correctAnswer: answer,
      tolerance: 0.001,
      operands: [num1, denom, num2, denom2],
      displayTokens: [
        fractionToken(num1, denom),
        symToken('×'),
        fractionToken(num2, denom2),
        symToken('='),
        symToken('?'),
      ],
      hint: `Multiply numerators: ${num1} × ${num2}. Multiply denominators: ${denom} × ${denom2}.`,
    };
  }

  // For grade 6+: division of fractions (invert and multiply)
  const num2 = randInt(1, 8);
  const denom2 = Math.max(2, randInt(2, 10));
  const answer = round((num1 * denom2) / (denom * num2));
  return {
    id: generateId(),
    grade,
    operation: 'fractions',
    question: `${num1}/${denom} ÷ ${num2}/${denom2} = ?`,
    correctAnswer: answer,
    tolerance: 0.001,
    operands: [num1, denom, num2, denom2],
    displayTokens: [
      fractionToken(num1, denom),
      symToken('÷'),
      fractionToken(num2, denom2),
      symToken('='),
      symToken('?'),
    ],
    hint: `Invert the second fraction and multiply: ${num1}/${denom} × ${denom2}/${num2}.`,
  };
}

function buildDecimals(config: ProblemTypeConfig, grade: Grade): Problem {
  const a = randomFromRange(config.operandRanges[0]);
  const b = randomFromRange(config.operandRanges[1]);

  // Grade 5: addition/subtraction; Grade 6+: multiplication/division
  if (grade === '5') {
    const useAdd = Math.random() < 0.5;
    if (useAdd) {
      const answer = round(a + b, 2);
      return {
        id: generateId(),
        grade,
        operation: 'decimals',
        question: `${fmt(a)} + ${fmt(b)} = ?`,
        correctAnswer: answer,
        tolerance: 0.01,
        operands: [a, b],
        displayTokens: [numToken(fmt(a)), symToken('+'), numToken(fmt(b)), symToken('='), symToken('?')],
      };
    }
    const [big, small] = a >= b ? [a, b] : [b, a];
    const answer = round(big - small, 2);
    return {
      id: generateId(),
      grade,
      operation: 'decimals',
      question: `${fmt(big)} − ${fmt(small)} = ?`,
      correctAnswer: answer,
      tolerance: 0.01,
      operands: [big, small],
      displayTokens: [numToken(fmt(big)), symToken('−'), numToken(fmt(small)), symToken('='), symToken('?')],
    };
  }

  // Grade 6+: multiplication or division
  if (Math.random() < 0.5) {
    const answer = round(a * b, 2);
    return {
      id: generateId(),
      grade,
      operation: 'decimals',
      question: `${fmt(a)} × ${fmt(b)} = ?`,
      correctAnswer: answer,
      tolerance: 0.01,
      operands: [a, b],
      displayTokens: [numToken(fmt(a)), symToken('×'), numToken(fmt(b)), symToken('='), symToken('?')],
    };
  }
  // Division: generate as a × b, then ask a×b ÷ b = ?
  const product = round(a * b, 2);
  const divisor = b === 0 ? 1 : b;
  const answer = round(product / divisor, 2);
  return {
    id: generateId(),
    grade,
    operation: 'decimals',
    question: `${fmt(product)} ÷ ${fmt(divisor)} = ?`,
    correctAnswer: answer,
    tolerance: 0.01,
    operands: [product, divisor],
    displayTokens: [numToken(fmt(product)), symToken('÷'), numToken(fmt(divisor)), symToken('='), symToken('?')],
  };
}

function buildRatios(config: ProblemTypeConfig, grade: Grade): Problem {
  const a = randomFromRange(config.operandRanges[0]);
  const b = randomFromRange(config.operandRanges[1]);

  if (grade === '7') {
    // Proportional reasoning: a/b = ?/c  → find missing value
    const multiplier = randInt(2, 5);
    const c = b * multiplier;
    const answer = a * multiplier;
    return {
      id: generateId(),
      grade,
      operation: 'ratios',
      question: `If ${a}/${b} = ?/${c}, find ?.`,
      correctAnswer: answer,
      tolerance: 0,
      operands: [a, b, c],
      displayTokens: [
        fractionToken(a, b),
        symToken('='),
        fractionToken('?', c),
      ],
      hint: `${c} ÷ ${b} = ${multiplier}. Multiply ${a} by ${multiplier}.`,
    };
  }

  // Grade 6: simplify ratio
  const g = gcd(a, b);
  const simpA = a / g;
  const simpB = b / g;
  // Answer is the simplified first term (we ask for the simplified ratio as simpA)
  // We'll ask for the simplified form's first term when second is simpB
  return {
    id: generateId(),
    grade,
    operation: 'ratios',
    question: `Simplify the ratio ${a}:${b}. What is the first term? (Answer: ${simpA})`,
    correctAnswer: simpA,
    tolerance: 0,
    operands: [a, b],
    displayTokens: [numToken(a), symToken(':'), numToken(b), symToken('→'), symToken('?'), symToken(':'), numToken(simpB)],
    hint: `Find the GCD of ${a} and ${b}, which is ${g}. Divide both by ${g}.`,
  };
}

function buildPercentages(config: ProblemTypeConfig, grade: Grade): Problem {
  const percent = randomFromRange(config.operandRanges[0]);
  const whole = randomFromRange(config.operandRanges[1]);

  if (grade === '7') {
    // Percent increase/decrease
    const isIncrease = Math.random() < 0.5;
    const change = round((percent / 100) * whole, 2);
    const answer = isIncrease ? round(whole + change, 2) : round(whole - change, 2);
    const word = isIncrease ? 'increase' : 'decrease';
    return {
      id: generateId(),
      grade,
      operation: 'percentages',
      question: `${word.charAt(0).toUpperCase() + word.slice(1)} ${whole} by ${percent}%. What is the result?`,
      correctAnswer: answer,
      tolerance: 0.01,
      operands: [percent, whole],
      displayTokens: [numToken(whole), symToken(isIncrease ? '+' : '−'), numToken(`${percent}%`), symToken('='), symToken('?')],
      hint: `${percent}% of ${whole} = ${change}. ${isIncrease ? 'Add' : 'Subtract'} that from ${whole}.`,
    };
  }

  // Grade 6: find percentage of a number
  const answer = round((percent / 100) * whole, 2);
  return {
    id: generateId(),
    grade,
    operation: 'percentages',
    question: `What is ${percent}% of ${whole}?`,
    correctAnswer: answer,
    tolerance: 0.01,
    operands: [percent, whole],
    displayTokens: [numToken(`${percent}%`), symToken('of'), numToken(whole), symToken('='), symToken('?')],
    hint: `Convert ${percent}% to a decimal (${percent / 100}) and multiply by ${whole}.`,
  };
}

function buildExponents(config: ProblemTypeConfig, grade: Grade): Problem {
  const base = randomFromRange(config.operandRanges[0]);
  const power = randomFromRange(config.operandRanges[1]);
  const answer = Math.pow(base, power);

  return {
    id: generateId(),
    grade,
    operation: 'exponents',
    question: `${base}^${power} = ?`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [base, power],
    displayTokens: [exponentToken(base, power), symToken('='), symToken('?')],
    hint: `Multiply ${base} by itself ${power} time${power > 1 ? 's' : ''}.`,
  };
}

function buildSquareRoots(config: ProblemTypeConfig, grade: Grade): Problem {
  const root = randomFromRange(config.operandRanges[0]);
  const radicand = root * root;

  return {
    id: generateId(),
    grade,
    operation: 'square_roots',
    question: `√${radicand} = ?`,
    correctAnswer: root,
    tolerance: 0,
    operands: [radicand],
    displayTokens: [sqrtToken(radicand), symToken('='), symToken('?')],
    hint: `What number times itself equals ${radicand}?`,
  };
}

function buildOrderOfOperations(config: ProblemTypeConfig, grade: Grade): Problem {
  const a = randomFromRange(config.operandRanges[0]);
  const b = randomFromRange(config.operandRanges[1]);
  const c = randomFromRange(config.operandRanges[2]);

  // Pattern: a + b × c
  const answer = a + b * c;
  return {
    id: generateId(),
    grade,
    operation: 'order_of_operations',
    question: `${a} + ${b} × ${c} = ?`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [a, b, c],
    displayTokens: [
      numToken(a), symToken('+'), numToken(b), symToken('×'), numToken(c),
      symToken('='), symToken('?'),
    ],
    hint: `Remember PEMDAS: multiply first (${b} × ${c} = ${b * c}), then add ${a}.`,
  };
}

function buildAlgebraicExpressions(config: ProblemTypeConfig, grade: Grade): Problem {
  // Evaluate 2x + b for a given x
  const coefficient = randInt(2, 6);
  const constant = randomFromRange(config.operandRanges[1]);
  const x = randomFromRange(config.operandRanges[0]);
  const answer = coefficient * x + constant;

  return {
    id: generateId(),
    grade,
    operation: 'algebraic_expressions',
    question: `Evaluate ${coefficient}x + ${constant} when x = ${x}.`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [coefficient, x, constant],
    displayTokens: [
      numToken(coefficient), symToken('x'), symToken('+'), numToken(constant),
      symToken(','), symToken('x'), symToken('='), numToken(x),
    ],
    hint: `Substitute x = ${x}: ${coefficient}(${x}) + ${constant} = ${coefficient * x} + ${constant}.`,
  };
}

function buildLinearEquations(config: ProblemTypeConfig, grade: Grade): Problem {
  const a = randInt(2, Math.min(10, config.operandRanges[0].max));
  const x = randomFromRange(config.operandRanges[0]);

  if (grade === '7') {
    // One-step: ax = b
    const b = a * x;
    return {
      id: generateId(),
      grade,
      operation: 'linear_equations',
      question: `Solve: ${a}x = ${b}`,
      correctAnswer: x,
      tolerance: 0,
      operands: [a, b],
      displayTokens: [numToken(a), symToken('x'), symToken('='), numToken(b)],
      hint: `Divide both sides by ${a}.`,
    };
  }

  // Two-step / multi-step: ax + c = b
  const c = randInt(1, 20);
  const b = a * x + c;
  return {
    id: generateId(),
    grade,
    operation: 'linear_equations',
    question: `Solve: ${a}x + ${c} = ${b}`,
    correctAnswer: x,
    tolerance: 0,
    operands: [a, c, b],
    displayTokens: [
      numToken(a), symToken('x'), symToken('+'), numToken(c), symToken('='), numToken(b),
    ],
    hint: `Subtract ${c} from both sides, then divide by ${a}.`,
  };
}

function buildInequalities(config: ProblemTypeConfig, grade: Grade): Problem {
  // Solve: ax + c > b  →  x > (b - c) / a
  const a = randInt(2, 8);
  const x = randomFromRange(config.operandRanges[0]);
  const c = randInt(1, 15);
  const b = a * x + c;
  // We ask: what is the boundary value of x?
  return {
    id: generateId(),
    grade,
    operation: 'inequalities',
    question: `Solve: ${a}x + ${c} > ${b}. What value must x be greater than?`,
    correctAnswer: x,
    tolerance: 0,
    operands: [a, c, b],
    displayTokens: [
      numToken(a), symToken('x'), symToken('+'), numToken(c), symToken('>'), numToken(b),
    ],
    hint: `Subtract ${c}, then divide by ${a}: x > (${b} − ${c}) / ${a}.`,
  };
}

function buildGeometryArea(config: ProblemTypeConfig, grade: Grade): Problem {
  if (grade === '8' || config.label.includes('Pythagorean')) {
    // Pythagorean theorem: find hypotenuse given legs
    const a = randomFromRange(config.operandRanges[0]);
    const b = randomFromRange(config.operandRanges[1]);
    const cSq = a * a + b * b;
    const c = round(Math.sqrt(cSq), 2);
    return {
      id: generateId(),
      grade,
      operation: 'geometry_area',
      question: `A right triangle has legs ${a} and ${b}. Find the hypotenuse (round to 2 decimals).`,
      correctAnswer: c,
      tolerance: 0.01,
      operands: [a, b],
      displayTokens: [
        numToken(a), symToken('²'), symToken('+'), numToken(b), symToken('²'),
        symToken('='), symToken('c²'),
      ],
      hint: `c = √(${a}² + ${b}²) = √${cSq}.`,
    };
  }

  if (grade === '7' && config.label.includes('circle')) {
    // Area of a circle: πr²
    const r = randomFromRange(config.operandRanges[0]);
    const answer = round(Math.PI * r * r, 2);
    return {
      id: generateId(),
      grade,
      operation: 'geometry_area',
      question: `Find the area of a circle with radius ${r} (round to 2 decimals, use π ≈ 3.14159).`,
      correctAnswer: answer,
      tolerance: 0.1,
      operands: [r],
      displayTokens: [symToken('π'), symToken('×'), numToken(r), symToken('²'), symToken('='), symToken('?')],
      hint: `Area = πr² = π × ${r}² = π × ${r * r}.`,
    };
  }

  if (grade === '10' || config.label.includes('composite')) {
    // Composite shape: rectangle + triangle
    const w = randomFromRange(config.operandRanges[0]);
    const h = randomFromRange(config.operandRanges[1]);
    const triH = randInt(1, h);
    const answer = round(w * h + 0.5 * w * triH, 2);
    return {
      id: generateId(),
      grade,
      operation: 'geometry_area',
      question: `A shape is a ${w}×${h} rectangle with a triangle (base ${w}, height ${triH}) on top. Find the total area.`,
      correctAnswer: answer,
      tolerance: 0.01,
      operands: [w, h, triH],
      displayTokens: [numToken(w), symToken('×'), numToken(h), symToken('+'), fractionToken(1, 2), symToken('×'), numToken(w), symToken('×'), numToken(triH)],
      hint: `Rectangle: ${w}×${h} = ${w * h}. Triangle: ½×${w}×${triH} = ${0.5 * w * triH}. Add them.`,
    };
  }

  // Default: area of rectangle (Grade 3/6)
  const l = randomFromRange(config.operandRanges[0]);
  const w = randomFromRange(config.operandRanges[1]);

  if (grade === '6' && config.label.includes('triangle')) {
    // Area of triangle: ½ × base × height
    const answer = round(0.5 * l * w, 2);
    return {
      id: generateId(),
      grade,
      operation: 'geometry_area',
      question: `Find the area of a triangle with base ${l} and height ${w}.`,
      correctAnswer: answer,
      tolerance: 0.01,
      operands: [l, w],
      displayTokens: [fractionToken(1, 2), symToken('×'), numToken(l), symToken('×'), numToken(w), symToken('='), symToken('?')],
      hint: `Area = ½ × base × height = ½ × ${l} × ${w}.`,
    };
  }

  const answer = l * w;
  return {
    id: generateId(),
    grade,
    operation: 'geometry_area',
    question: `Find the area of a rectangle with length ${l} and width ${w}.`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [l, w],
    displayTokens: [numToken(l), symToken('×'), numToken(w), symToken('='), symToken('?')],
    hint: `Area = length × width = ${l} × ${w}.`,
  };
}

function buildGeometryPerimeter(config: ProblemTypeConfig, grade: Grade): Problem {
  const l = randomFromRange(config.operandRanges[0]);
  const w = randomFromRange(config.operandRanges[1]);
  const answer = 2 * (l + w);
  return {
    id: generateId(),
    grade,
    operation: 'geometry_perimeter',
    question: `Find the perimeter of a rectangle with length ${l} and width ${w}.`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [l, w],
    displayTokens: [
      numToken(2), symToken('×'), symToken('('), numToken(l), symToken('+'), numToken(w), symToken(')'),
      symToken('='), symToken('?'),
    ],
    hint: `Perimeter = 2 × (length + width) = 2 × (${l} + ${w}).`,
  };
}

function buildGeometryVolume(config: ProblemTypeConfig, grade: Grade): Problem {
  if (grade === '10' || config.label.includes('cylinder')) {
    // Volume of cylinder: πr²h
    const r = randomFromRange(config.operandRanges[0]);
    const h = randomFromRange(config.operandRanges[1]);
    const answer = round(Math.PI * r * r * h, 2);
    return {
      id: generateId(),
      grade,
      operation: 'geometry_volume',
      question: `Find the volume of a cylinder with radius ${r} and height ${h} (round to 2 decimals).`,
      correctAnswer: answer,
      tolerance: 0.5,
      operands: [r, h],
      displayTokens: [symToken('π'), symToken('×'), numToken(r), symToken('²'), symToken('×'), numToken(h), symToken('='), symToken('?')],
      hint: `V = πr²h = π × ${r}² × ${h} = π × ${r * r} × ${h}.`,
    };
  }

  // Rectangular prism: l × w × h
  const l = randomFromRange(config.operandRanges[0]);
  const w = randomFromRange(config.operandRanges[1]);
  const h = randomFromRange(config.operandRanges[2] ?? config.operandRanges[1]);
  const answer = l * w * h;
  return {
    id: generateId(),
    grade,
    operation: 'geometry_volume',
    question: `Find the volume of a rectangular prism: ${l} × ${w} × ${h}.`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [l, w, h],
    displayTokens: [numToken(l), symToken('×'), numToken(w), symToken('×'), numToken(h), symToken('='), symToken('?')],
    hint: `Volume = length × width × height = ${l} × ${w} × ${h}.`,
  };
}

function buildGeometryAngles(config: ProblemTypeConfig, grade: Grade): Problem {
  if (config.operandCount === 1 || grade === '7') {
    // Supplementary / complementary
    const isSup = Math.random() < 0.5;
    const total = isSup ? 180 : 90;
    const angle = randomFromRange(config.operandRanges[0]);
    const clamped = Math.min(angle, total - 1);
    const answer = total - clamped;
    const word = isSup ? 'supplementary' : 'complementary';
    return {
      id: generateId(),
      grade,
      operation: 'geometry_angles',
      question: `Find the ${word} angle of ${clamped}°.`,
      correctAnswer: answer,
      tolerance: 0,
      operands: [clamped],
      displayTokens: [numToken(`${clamped}°`), symToken('+'), symToken('?'), symToken('='), numToken(`${total}°`)],
      hint: `${word.charAt(0).toUpperCase() + word.slice(1)} angles sum to ${total}°. So ? = ${total}° − ${clamped}°.`,
    };
  }

  if (grade === '10') {
    // Triangle angle sum: given two angles, find the third
    const a = randomFromRange(config.operandRanges[0]);
    const b = randomFromRange(config.operandRanges[1]);
    const sum = a + b;
    const clamped = sum >= 180 ? 100 : sum; // ensure valid triangle
    const aAdj = a;
    const bAdj = Math.min(b, 179 - a);
    const answer = 180 - aAdj - bAdj;
    return {
      id: generateId(),
      grade,
      operation: 'geometry_angles',
      question: `A triangle has angles ${aAdj}° and ${bAdj}°. Find the third angle.`,
      correctAnswer: answer,
      tolerance: 0,
      operands: [aAdj, bAdj],
      displayTokens: [numToken(`${aAdj}°`), symToken('+'), numToken(`${bAdj}°`), symToken('+'), symToken('?'), symToken('='), numToken('180°')],
      hint: `Angles in a triangle sum to 180°. So ? = 180° − ${aAdj}° − ${bAdj}°.`,
    };
  }

  // Grade 4: angle addition
  const a = randomFromRange(config.operandRanges[0]);
  const b = randomFromRange(config.operandRanges[1]);
  const answer = a + b;
  return {
    id: generateId(),
    grade,
    operation: 'geometry_angles',
    question: `Two adjacent angles measure ${a}° and ${b}°. What is the total?`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [a, b],
    displayTokens: [numToken(`${a}°`), symToken('+'), numToken(`${b}°`), symToken('='), symToken('?')],
  };
}

function buildTrigonometry(config: ProblemTypeConfig, grade: Grade): Problem {
  if (config.operandCount === 1) {
    // Evaluate trig function at a known angle
    const knownAngles = [0, 30, 45, 60, 90];
    const angle = knownAngles[randInt(0, knownAngles.length - 1)];
    const funcs = ['sin', 'cos'] as const;
    const fn = funcs[randInt(0, 1)];
    const rad = (angle * Math.PI) / 180;
    const answer = round(fn === 'sin' ? Math.sin(rad) : Math.cos(rad), 2);
    return {
      id: generateId(),
      grade,
      operation: 'trigonometry',
      question: `${fn}(${angle}°) = ? (round to 2 decimals)`,
      correctAnswer: answer,
      tolerance: 0.01,
      operands: [angle],
      displayTokens: [symToken(fn), symToken('('), numToken(`${angle}°`), symToken(')'), symToken('='), symToken('?')],
    };
  }

  // SOH-CAH-TOA: given opposite and angle, find hypotenuse (sin)
  const opp = randomFromRange(config.operandRanges[0]);
  const angle = randomFromRange(config.operandRanges[1]);
  const rad = (angle * Math.PI) / 180;
  const sinVal = Math.sin(rad);
  if (sinVal === 0) {
    // Fallback: just do cos
    const cosVal = Math.cos(rad);
    const adj = opp;
    const hyp = round(adj / (cosVal || 1), 2);
    return {
      id: generateId(),
      grade,
      operation: 'trigonometry',
      question: `Adjacent = ${adj}, angle = ${angle}°. Find the hypotenuse using cos (round to 2 decimals).`,
      correctAnswer: hyp,
      tolerance: 0.1,
      operands: [adj, angle],
      displayTokens: [symToken('cos'), symToken('('), numToken(`${angle}°`), symToken(')'), symToken('='), numToken(adj), symToken('/'), symToken('?')],
    };
  }
  const hyp = round(opp / sinVal, 2);
  return {
    id: generateId(),
    grade,
    operation: 'trigonometry',
    question: `Opposite = ${opp}, angle = ${angle}°. Find the hypotenuse using sin (round to 2 decimals).`,
    correctAnswer: hyp,
    tolerance: 0.1,
    operands: [opp, angle],
    displayTokens: [symToken('sin'), symToken('('), numToken(`${angle}°`), symToken(')'), symToken('='), numToken(opp), symToken('/'), symToken('?')],
    hint: `hyp = opposite / sin(angle) = ${opp} / sin(${angle}°).`,
  };
}

function buildLogarithms(config: ProblemTypeConfig, grade: Grade): Problem {
  const base = randomFromRange(config.operandRanges[0]);
  const exp = randomFromRange(config.operandRanges[1]);
  const result = Math.pow(base, exp);
  // Ask: log_base(result) = ?
  return {
    id: generateId(),
    grade,
    operation: 'logarithms',
    question: `log base ${base} of ${result} = ?`,
    correctAnswer: exp,
    tolerance: 0,
    operands: [base, result],
    displayTokens: [symToken('log'), numToken(base), symToken('('), numToken(result), symToken(')'), symToken('='), symToken('?')],
    hint: `${base} raised to what power equals ${result}? ${base}^${exp} = ${result}.`,
  };
}

function buildPolynomials(config: ProblemTypeConfig, grade: Grade): Problem {
  // Evaluate a polynomial: ax² + bx + c at a given x
  const a = randInt(1, 5);
  const b = randomFromRange(config.operandRanges[0]);
  const c = randomFromRange(config.operandRanges[1]);
  const x = randInt(-5, 5);
  const answer = a * x * x + b * x + c;
  return {
    id: generateId(),
    grade,
    operation: 'polynomials',
    question: `Evaluate ${a}x² + ${b >= 0 ? b : `(${b})`}x + ${c >= 0 ? c : `(${c})`} at x = ${x}.`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [a, b, c, x],
    displayTokens: [
      numToken(a), symToken('x²'), symToken(b >= 0 ? '+' : '−'), numToken(Math.abs(b)),
      symToken('x'), symToken(c >= 0 ? '+' : '−'), numToken(Math.abs(c)),
      symToken(','), symToken('x'), symToken('='), numToken(x),
    ],
    hint: `Substitute x = ${x}: ${a}(${x})² + ${b}(${x}) + ${c} = ${a * x * x} + ${b * x} + ${c}.`,
  };
}

function buildQuadraticEquations(config: ProblemTypeConfig, grade: Grade): Problem {
  // Generate from roots: (x - r1)(x - r2) = 0 → x² - (r1+r2)x + r1*r2 = 0
  const r1 = randomFromRange(config.operandRanges[0]);
  const r2 = randomFromRange(config.operandRanges[1]);
  const bCoeff = -(r1 + r2);
  const cCoeff = r1 * r2;
  // Ask for the smaller root
  const answer = Math.min(r1, r2);
  const bStr = bCoeff >= 0 ? `+ ${bCoeff}` : `− ${Math.abs(bCoeff)}`;
  const cStr = cCoeff >= 0 ? `+ ${cCoeff}` : `− ${Math.abs(cCoeff)}`;
  return {
    id: generateId(),
    grade,
    operation: 'quadratic_equations',
    question: `Solve: x² ${bStr}x ${cStr} = 0. What is the smaller root?`,
    correctAnswer: answer,
    tolerance: 0,
    operands: [1, bCoeff, cCoeff],
    displayTokens: [
      symToken('x²'), symToken(bCoeff >= 0 ? '+' : '−'), numToken(Math.abs(bCoeff)),
      symToken('x'), symToken(cCoeff >= 0 ? '+' : '−'), numToken(Math.abs(cCoeff)),
      symToken('='), numToken(0),
    ],
    hint: `Factor: (x − ${r1})(x − ${r2}) = 0. Roots: x = ${r1} and x = ${r2}.`,
  };
}

// ---------------------------------------------------------------------------
// Operation → Builder map
// ---------------------------------------------------------------------------

const BUILDERS: Record<Operation, ProblemBuilder> = {
  counting: buildCounting,
  addition: buildAddition,
  subtraction: buildSubtraction,
  multiplication: buildMultiplication,
  division: buildDivision,
  fractions: buildFractions,
  decimals: buildDecimals,
  ratios: buildRatios,
  percentages: buildPercentages,
  exponents: buildExponents,
  square_roots: buildSquareRoots,
  order_of_operations: buildOrderOfOperations,
  algebraic_expressions: buildAlgebraicExpressions,
  linear_equations: buildLinearEquations,
  inequalities: buildInequalities,
  geometry_area: buildGeometryArea,
  geometry_perimeter: buildGeometryPerimeter,
  geometry_volume: buildGeometryVolume,
  geometry_angles: buildGeometryAngles,
  trigonometry: buildTrigonometry,
  logarithms: buildLogarithms,
  polynomials: buildPolynomials,
  quadratic_equations: buildQuadraticEquations,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a single math problem for the given grade level.
 * Randomly picks a problem type weighted by the grade configuration.
 */
export function generateProblem(grade: Grade): Problem {
  const config = GRADE_CONFIGS[grade];
  if (!config) {
    throw new Error(`No configuration found for grade "${grade}".`);
  }
  const typeConfig = weightedPick(config.problemTypes);
  const builder = BUILDERS[typeConfig.operation];
  return builder(typeConfig, grade);
}

/**
 * Generate a batch of problems for the given grade level.
 * Useful for pre-loading a set of problems at session start.
 */
export function generateProblemBatch(grade: Grade, count: number): Problem[] {
  const problems: Problem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(generateProblem(grade));
  }
  return problems;
}

/**
 * Check whether a user's answer is correct for a given problem.
 * Uses the problem's tolerance for comparison.
 */
export function checkAnswer(problem: Problem, userAnswer: number): boolean {
  return Math.abs(userAnswer - problem.correctAnswer) <= problem.tolerance;
}

/**
 * Get the grade configuration for a given grade.
 */
export function getGradeConfig(grade: Grade): GradeConfig {
  const config = GRADE_CONFIGS[grade];
  if (!config) {
    throw new Error(`No configuration found for grade "${grade}".`);
  }
  return config;
}
