/**
 * Math Problem Engine — Type Definitions
 *
 * Core types for the math problem generator, aligned with Common Core standards.
 * These types are consumed by the game UI (3D and 2D renderers) and the game state hook.
 */

// ---------------------------------------------------------------------------
// Grade
// ---------------------------------------------------------------------------

/** Grade levels K through 12. "K" is kindergarten; 1–12 are numeric grades. */
export type Grade = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

export const ALL_GRADES: Grade[] = [
  'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
];

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/** Arithmetic / algebraic operations the engine can generate. */
export type Operation =
  | 'counting'
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'fractions'
  | 'decimals'
  | 'ratios'
  | 'percentages'
  | 'exponents'
  | 'square_roots'
  | 'order_of_operations'
  | 'algebraic_expressions'
  | 'linear_equations'
  | 'inequalities'
  | 'geometry_area'
  | 'geometry_perimeter'
  | 'geometry_volume'
  | 'geometry_angles'
  | 'trigonometry'
  | 'logarithms'
  | 'polynomials'
  | 'quadratic_equations';

// ---------------------------------------------------------------------------
// Display Tokens  (consumed by 3D / 2D renderers)
// ---------------------------------------------------------------------------

/** A single visual element in the problem display. */
export type DisplayToken =
  | { type: 'number'; value: string }
  | { type: 'symbol'; value: string }   // e.g. "+", "−", "×", "÷", "=", "?", "(", ")"
  | { type: 'fraction'; numerator: string; denominator: string }
  | { type: 'exponent'; base: string; power: string }
  | { type: 'sqrt'; radicand: string };

// ---------------------------------------------------------------------------
// Problem
// ---------------------------------------------------------------------------

/** A single math problem produced by the generator. */
export interface Problem {
  /** Unique ID for this problem instance (UUID-style). */
  id: string;
  /** The grade level this problem targets. */
  grade: Grade;
  /** The operation category (for analytics / display). */
  operation: Operation;
  /** Human-readable question string, e.g. "12 + 7 = ?" */
  question: string;
  /** The correct answer as a number (used for evaluation). */
  correctAnswer: number;
  /**
   * Acceptable tolerance for comparing the user's answer to the correct answer.
   * Defaults to 0 for integer problems; may be > 0 for decimals / geometry.
   */
  tolerance: number;
  /** The operands involved (useful for analytics). */
  operands: number[];
  /** Ordered list of tokens the renderer should display (numbers, symbols, etc.). */
  displayTokens: DisplayToken[];
  /** Optional hint text shown after an incorrect answer. */
  hint?: string;
}

// ---------------------------------------------------------------------------
// Grade Configuration
// ---------------------------------------------------------------------------

/** Number range used when generating operands. */
export interface NumberRange {
  min: number;
  max: number;
  /** When true, generated values may be decimals (rounded to `decimalPlaces`). */
  allowDecimals?: boolean;
  /** Number of decimal places (defaults to 2 when `allowDecimals` is true). */
  decimalPlaces?: number;
}

/** Configuration for a single problem type within a grade. */
export interface ProblemTypeConfig {
  /** The operation this config describes. */
  operation: Operation;
  /** Friendly label for this problem type, e.g. "Addition (0–20)". */
  label: string;
  /** Weight for random selection — higher = more likely to appear. */
  weight: number;
  /** Number range(s) for generating operands. */
  operandRanges: NumberRange[];
  /**
   * How many operands the problem uses.
   * Defaults to 2 for binary operations. Counting uses 1.
   */
  operandCount?: number;
}

/** Full configuration for a single grade level. */
export interface GradeConfig {
  grade: Grade;
  /** Display label, e.g. "Kindergarten", "Grade 3". */
  label: string;
  /** Short description of Common Core focus areas for this grade. */
  description: string;
  /** Problem types available at this grade level. */
  problemTypes: ProblemTypeConfig[];
}
