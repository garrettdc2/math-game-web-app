/**
 * Common Core Standards — Grade-Level Configurations (K–12)
 *
 * Each grade defines the problem types, operations, and number ranges
 * aligned with Common Core State Standards for Mathematics.
 *
 * References:
 *   - K:   Counting & Cardinality, Operations & Algebraic Thinking (OA)
 *   - 1-2: OA, Number & Operations in Base Ten (NBT)
 *   - 3-5: OA, NBT, Number & Operations—Fractions (NF), Measurement & Data (MD)
 *   - 6-8: Ratios & Proportional Relationships (RP), The Number System (NS),
 *          Expressions & Equations (EE), Geometry (G)
 *   - 9-12: Algebra, Functions, Geometry, Statistics (high-school standards)
 */

import type { Grade, GradeConfig } from './types';

// ---------------------------------------------------------------------------
// Kindergarten
// ---------------------------------------------------------------------------

const gradeK: GradeConfig = {
  grade: 'K',
  label: 'Kindergarten',
  description: 'Counting to 20, comparing numbers, simple addition and subtraction within 10.',
  problemTypes: [
    {
      operation: 'counting',
      label: 'Counting (1–20)',
      weight: 3,
      operandRanges: [{ min: 1, max: 20 }],
      operandCount: 1,
    },
    {
      operation: 'addition',
      label: 'Addition (0–10)',
      weight: 4,
      operandRanges: [{ min: 0, max: 10 }, { min: 0, max: 10 }],
    },
    {
      operation: 'subtraction',
      label: 'Subtraction (0–10)',
      weight: 3,
      operandRanges: [{ min: 0, max: 10 }, { min: 0, max: 10 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 1
// ---------------------------------------------------------------------------

const grade1: GradeConfig = {
  grade: '1',
  label: 'Grade 1',
  description: 'Addition and subtraction within 20, place value introduction.',
  problemTypes: [
    {
      operation: 'addition',
      label: 'Addition (0–20)',
      weight: 5,
      operandRanges: [{ min: 0, max: 20 }, { min: 0, max: 20 }],
    },
    {
      operation: 'subtraction',
      label: 'Subtraction (0–20)',
      weight: 5,
      operandRanges: [{ min: 0, max: 20 }, { min: 0, max: 20 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 2
// ---------------------------------------------------------------------------

const grade2: GradeConfig = {
  grade: '2',
  label: 'Grade 2',
  description: 'Addition and subtraction within 100, introduction to measurement and data.',
  problemTypes: [
    {
      operation: 'addition',
      label: 'Addition (0–100)',
      weight: 4,
      operandRanges: [{ min: 0, max: 100 }, { min: 0, max: 100 }],
    },
    {
      operation: 'subtraction',
      label: 'Subtraction (0–100)',
      weight: 4,
      operandRanges: [{ min: 0, max: 100 }, { min: 0, max: 100 }],
    },
    {
      operation: 'addition',
      label: 'Three-addend addition (0–20)',
      weight: 2,
      operandRanges: [{ min: 0, max: 20 }, { min: 0, max: 20 }, { min: 0, max: 20 }],
      operandCount: 3,
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 3
// ---------------------------------------------------------------------------

const grade3: GradeConfig = {
  grade: '3',
  label: 'Grade 3',
  description: 'Multiplication and division within 100, introduction to fractions, area and perimeter.',
  problemTypes: [
    {
      operation: 'addition',
      label: 'Addition (0–1000)',
      weight: 2,
      operandRanges: [{ min: 0, max: 1000 }, { min: 0, max: 1000 }],
    },
    {
      operation: 'subtraction',
      label: 'Subtraction (0–1000)',
      weight: 2,
      operandRanges: [{ min: 0, max: 1000 }, { min: 0, max: 1000 }],
    },
    {
      operation: 'multiplication',
      label: 'Multiplication (0–10)',
      weight: 4,
      operandRanges: [{ min: 0, max: 10 }, { min: 0, max: 10 }],
    },
    {
      operation: 'division',
      label: 'Division (within 100)',
      weight: 3,
      operandRanges: [{ min: 1, max: 10 }, { min: 1, max: 10 }],
    },
    {
      operation: 'geometry_area',
      label: 'Area of rectangles',
      weight: 1,
      operandRanges: [{ min: 1, max: 12 }, { min: 1, max: 12 }],
    },
    {
      operation: 'geometry_perimeter',
      label: 'Perimeter of rectangles',
      weight: 1,
      operandRanges: [{ min: 1, max: 12 }, { min: 1, max: 12 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 4
// ---------------------------------------------------------------------------

const grade4: GradeConfig = {
  grade: '4',
  label: 'Grade 4',
  description: 'Multi-digit arithmetic, fraction equivalence and comparison, angles.',
  problemTypes: [
    {
      operation: 'addition',
      label: 'Addition (0–10,000)',
      weight: 2,
      operandRanges: [{ min: 0, max: 10000 }, { min: 0, max: 10000 }],
    },
    {
      operation: 'subtraction',
      label: 'Subtraction (0–10,000)',
      weight: 2,
      operandRanges: [{ min: 0, max: 10000 }, { min: 0, max: 10000 }],
    },
    {
      operation: 'multiplication',
      label: 'Multiplication (up to 4-digit × 1-digit)',
      weight: 3,
      operandRanges: [{ min: 10, max: 9999 }, { min: 2, max: 9 }],
    },
    {
      operation: 'division',
      label: 'Division (up to 4-digit ÷ 1-digit)',
      weight: 3,
      operandRanges: [{ min: 2, max: 9 }, { min: 2, max: 99 }],
    },
    {
      operation: 'fractions',
      label: 'Fraction addition (same denominator)',
      weight: 2,
      operandRanges: [{ min: 1, max: 10 }, { min: 2, max: 12 }],
    },
    {
      operation: 'geometry_angles',
      label: 'Angle measurement',
      weight: 1,
      operandRanges: [{ min: 10, max: 170 }, { min: 10, max: 170 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 5
// ---------------------------------------------------------------------------

const grade5: GradeConfig = {
  grade: '5',
  label: 'Grade 5',
  description: 'Fraction operations, decimals, volume, coordinate plane introduction.',
  problemTypes: [
    {
      operation: 'multiplication',
      label: 'Multi-digit multiplication',
      weight: 2,
      operandRanges: [{ min: 10, max: 999 }, { min: 10, max: 99 }],
    },
    {
      operation: 'division',
      label: 'Multi-digit division',
      weight: 2,
      operandRanges: [{ min: 2, max: 20 }, { min: 2, max: 99 }],
    },
    {
      operation: 'fractions',
      label: 'Fraction addition/subtraction',
      weight: 3,
      operandRanges: [{ min: 1, max: 10 }, { min: 2, max: 12 }],
    },
    {
      operation: 'fractions',
      label: 'Fraction multiplication',
      weight: 2,
      operandRanges: [{ min: 1, max: 8 }, { min: 2, max: 10 }],
    },
    {
      operation: 'decimals',
      label: 'Decimal addition/subtraction',
      weight: 2,
      operandRanges: [
        { min: 0, max: 100, allowDecimals: true, decimalPlaces: 2 },
        { min: 0, max: 100, allowDecimals: true, decimalPlaces: 2 },
      ],
    },
    {
      operation: 'geometry_volume',
      label: 'Volume of rectangular prisms',
      weight: 1,
      operandRanges: [{ min: 1, max: 10 }, { min: 1, max: 10 }, { min: 1, max: 10 }],
      operandCount: 3,
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 6
// ---------------------------------------------------------------------------

const grade6: GradeConfig = {
  grade: '6',
  label: 'Grade 6',
  description: 'Ratios, proportional reasoning, division of fractions, integers, expressions and equations.',
  problemTypes: [
    {
      operation: 'ratios',
      label: 'Ratio simplification',
      weight: 2,
      operandRanges: [{ min: 2, max: 50 }, { min: 2, max: 50 }],
    },
    {
      operation: 'fractions',
      label: 'Fraction division',
      weight: 3,
      operandRanges: [{ min: 1, max: 10 }, { min: 2, max: 10 }],
    },
    {
      operation: 'decimals',
      label: 'Decimal multiplication/division',
      weight: 2,
      operandRanges: [
        { min: 0, max: 100, allowDecimals: true, decimalPlaces: 2 },
        { min: 1, max: 50, allowDecimals: true, decimalPlaces: 1 },
      ],
    },
    {
      operation: 'percentages',
      label: 'Percentage of a number',
      weight: 2,
      operandRanges: [{ min: 1, max: 100 }, { min: 10, max: 500 }],
    },
    {
      operation: 'algebraic_expressions',
      label: 'Evaluate expressions',
      weight: 2,
      operandRanges: [{ min: 1, max: 20 }, { min: 1, max: 20 }],
    },
    {
      operation: 'geometry_area',
      label: 'Area of triangles and quadrilaterals',
      weight: 1,
      operandRanges: [{ min: 1, max: 20 }, { min: 1, max: 20 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 7
// ---------------------------------------------------------------------------

const grade7: GradeConfig = {
  grade: '7',
  label: 'Grade 7',
  description: 'Proportional relationships, rational number operations, linear equations, geometry (area, circumference, angles).',
  problemTypes: [
    {
      operation: 'ratios',
      label: 'Proportional relationships',
      weight: 2,
      operandRanges: [{ min: 2, max: 50 }, { min: 2, max: 50 }],
    },
    {
      operation: 'addition',
      label: 'Integer addition (negative numbers)',
      weight: 2,
      operandRanges: [{ min: -50, max: 50 }, { min: -50, max: 50 }],
    },
    {
      operation: 'multiplication',
      label: 'Integer multiplication (negative numbers)',
      weight: 2,
      operandRanges: [{ min: -12, max: 12 }, { min: -12, max: 12 }],
    },
    {
      operation: 'percentages',
      label: 'Percent increase / decrease',
      weight: 2,
      operandRanges: [{ min: 5, max: 100 }, { min: 20, max: 500 }],
    },
    {
      operation: 'linear_equations',
      label: 'One-step equations',
      weight: 2,
      operandRanges: [{ min: 1, max: 20 }, { min: 1, max: 100 }],
    },
    {
      operation: 'geometry_area',
      label: 'Area of circles',
      weight: 1,
      operandRanges: [{ min: 1, max: 15 }],
      operandCount: 1,
    },
    {
      operation: 'geometry_angles',
      label: 'Supplementary & complementary angles',
      weight: 1,
      operandRanges: [{ min: 10, max: 170 }],
      operandCount: 1,
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 8
// ---------------------------------------------------------------------------

const grade8: GradeConfig = {
  grade: '8',
  label: 'Grade 8',
  description: 'Exponents, square roots, linear equations, systems intro, Pythagorean theorem, transformations.',
  problemTypes: [
    {
      operation: 'exponents',
      label: 'Exponent evaluation',
      weight: 3,
      operandRanges: [{ min: 1, max: 12 }, { min: 2, max: 4 }],
    },
    {
      operation: 'square_roots',
      label: 'Perfect square roots',
      weight: 2,
      operandRanges: [{ min: 1, max: 15 }],
      operandCount: 1,
    },
    {
      operation: 'linear_equations',
      label: 'Two-step equations',
      weight: 3,
      operandRanges: [{ min: 1, max: 20 }, { min: 1, max: 50 }],
    },
    {
      operation: 'order_of_operations',
      label: 'Order of operations',
      weight: 2,
      operandRanges: [{ min: 1, max: 12 }, { min: 1, max: 12 }, { min: 1, max: 12 }],
      operandCount: 3,
    },
    {
      operation: 'geometry_area',
      label: 'Pythagorean theorem',
      weight: 2,
      operandRanges: [{ min: 1, max: 20 }, { min: 1, max: 20 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 9  (Algebra I focus)
// ---------------------------------------------------------------------------

const grade9: GradeConfig = {
  grade: '9',
  label: 'Grade 9',
  description: 'Algebra I: linear equations, inequalities, exponent rules, polynomials introduction.',
  problemTypes: [
    {
      operation: 'linear_equations',
      label: 'Multi-step linear equations',
      weight: 3,
      operandRanges: [{ min: 1, max: 20 }, { min: 1, max: 50 }],
    },
    {
      operation: 'inequalities',
      label: 'Solve inequalities',
      weight: 2,
      operandRanges: [{ min: 1, max: 20 }, { min: 1, max: 50 }],
    },
    {
      operation: 'exponents',
      label: 'Exponent rules (product/quotient)',
      weight: 2,
      operandRanges: [{ min: 2, max: 10 }, { min: 1, max: 5 }],
    },
    {
      operation: 'polynomials',
      label: 'Polynomial evaluation',
      weight: 2,
      operandRanges: [{ min: -5, max: 5 }, { min: -5, max: 5 }],
    },
    {
      operation: 'order_of_operations',
      label: 'Order of operations (advanced)',
      weight: 1,
      operandRanges: [{ min: 1, max: 15 }, { min: 1, max: 15 }, { min: 1, max: 10 }],
      operandCount: 3,
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 10  (Geometry focus)
// ---------------------------------------------------------------------------

const grade10: GradeConfig = {
  grade: '10',
  label: 'Grade 10',
  description: 'Geometry: area, volume, angles, similarity, trigonometric ratios introduction.',
  problemTypes: [
    {
      operation: 'geometry_area',
      label: 'Area of composite shapes',
      weight: 2,
      operandRanges: [{ min: 2, max: 20 }, { min: 2, max: 20 }],
    },
    {
      operation: 'geometry_volume',
      label: 'Volume of cylinders and cones',
      weight: 2,
      operandRanges: [{ min: 1, max: 15 }, { min: 1, max: 15 }],
    },
    {
      operation: 'geometry_angles',
      label: 'Angle relationships in triangles',
      weight: 2,
      operandRanges: [{ min: 20, max: 120 }, { min: 20, max: 120 }],
    },
    {
      operation: 'trigonometry',
      label: 'Sine, cosine, tangent',
      weight: 3,
      operandRanges: [{ min: 1, max: 30 }, { min: 10, max: 80 }],
    },
    {
      operation: 'quadratic_equations',
      label: 'Solve simple quadratics',
      weight: 2,
      operandRanges: [{ min: 1, max: 10 }, { min: 1, max: 10 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 11  (Algebra II / Pre-Calc focus)
// ---------------------------------------------------------------------------

const grade11: GradeConfig = {
  grade: '11',
  label: 'Grade 11',
  description: 'Algebra II: quadratic equations, polynomials, exponential & logarithmic functions.',
  problemTypes: [
    {
      operation: 'quadratic_equations',
      label: 'Quadratic equations (factoring)',
      weight: 3,
      operandRanges: [{ min: 1, max: 12 }, { min: 1, max: 12 }],
    },
    {
      operation: 'polynomials',
      label: 'Polynomial operations',
      weight: 2,
      operandRanges: [{ min: -10, max: 10 }, { min: -10, max: 10 }],
    },
    {
      operation: 'exponents',
      label: 'Exponential growth/decay',
      weight: 2,
      operandRanges: [{ min: 2, max: 10 }, { min: 1, max: 5 }],
    },
    {
      operation: 'logarithms',
      label: 'Evaluate logarithms',
      weight: 2,
      operandRanges: [{ min: 2, max: 10 }, { min: 1, max: 4 }],
    },
    {
      operation: 'trigonometry',
      label: 'Trigonometric expressions',
      weight: 1,
      operandRanges: [{ min: 0, max: 360 }],
      operandCount: 1,
    },
  ],
};

// ---------------------------------------------------------------------------
// Grade 12  (Pre-Calc / Calculus Prep focus)
// ---------------------------------------------------------------------------

const grade12: GradeConfig = {
  grade: '12',
  label: 'Grade 12',
  description: 'Pre-Calculus: advanced polynomials, logarithms, trigonometry, limits introduction.',
  problemTypes: [
    {
      operation: 'logarithms',
      label: 'Logarithmic equations',
      weight: 3,
      operandRanges: [{ min: 2, max: 10 }, { min: 1, max: 5 }],
    },
    {
      operation: 'polynomials',
      label: 'Polynomial roots',
      weight: 2,
      operandRanges: [{ min: -10, max: 10 }, { min: -10, max: 10 }],
    },
    {
      operation: 'trigonometry',
      label: 'Trigonometric identities',
      weight: 2,
      operandRanges: [{ min: 0, max: 360 }],
      operandCount: 1,
    },
    {
      operation: 'quadratic_equations',
      label: 'Quadratic formula',
      weight: 2,
      operandRanges: [{ min: 1, max: 15 }, { min: 1, max: 15 }],
    },
    {
      operation: 'exponents',
      label: 'Exponential/logarithmic relationships',
      weight: 2,
      operandRanges: [{ min: 2, max: 10 }, { min: 1, max: 6 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Map from grade to its configuration. */
export const GRADE_CONFIGS: Record<Grade, GradeConfig> = {
  K: gradeK,
  '1': grade1,
  '2': grade2,
  '3': grade3,
  '4': grade4,
  '5': grade5,
  '6': grade6,
  '7': grade7,
  '8': grade8,
  '9': grade9,
  '10': grade10,
  '11': grade11,
  '12': grade12,
};

/** Ordered array of all grade configs for iteration. */
export const ALL_GRADE_CONFIGS: GradeConfig[] = [
  gradeK, grade1, grade2, grade3, grade4, grade5, grade6,
  grade7, grade8, grade9, grade10, grade11, grade12,
];
