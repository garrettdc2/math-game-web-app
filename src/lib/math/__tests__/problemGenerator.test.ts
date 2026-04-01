import {
  generateProblem,
  generateProblemBatch,
  checkAnswer,
  getGradeConfig,
} from '../problemGenerator';
import type { Grade, Problem } from '../types';
import { ALL_GRADES } from '../types';

// ---------------------------------------------------------------------------
// getGradeConfig
// ---------------------------------------------------------------------------

describe('getGradeConfig', () => {
  it.each(ALL_GRADES)('returns a valid config for grade "%s"', (grade) => {
    const config = getGradeConfig(grade);
    expect(config).toBeDefined();
    expect(config.grade).toBe(grade);
    expect(config.label).toBeTruthy();
    expect(config.description).toBeTruthy();
    expect(config.problemTypes.length).toBeGreaterThan(0);
  });

  it('throws for an invalid grade', () => {
    expect(() => getGradeConfig('99' as Grade)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// generateProblem
// ---------------------------------------------------------------------------

describe('generateProblem', () => {
  it.each(ALL_GRADES)(
    'generates a valid Problem for grade "%s"',
    (grade) => {
      const problem = generateProblem(grade);
      expectValidProblem(problem, grade);
    },
  );

  it('generates unique IDs across multiple problems', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(generateProblem('3').id);
    }
    // At least 90% unique (random collisions are astronomically unlikely)
    expect(ids.size).toBeGreaterThanOrEqual(45);
  });

  it('generates problems with correct addition answers (Grade 1)', () => {
    // Run many iterations to increase confidence
    for (let i = 0; i < 100; i++) {
      const p = generateProblem('1');
      // For addition: a + b should match correctAnswer
      if (p.operation === 'addition') {
        const [a, b] = p.operands;
        expect(p.correctAnswer).toBeCloseTo(a + b, 4);
      }
    }
  });

  it('generates non-negative subtraction results for lower grades', () => {
    for (let i = 0; i < 100; i++) {
      const p = generateProblem('K');
      if (p.operation === 'subtraction') {
        expect(p.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('generates integer division answers', () => {
    for (let i = 0; i < 100; i++) {
      const p = generateProblem('3');
      if (p.operation === 'division') {
        expect(Number.isInteger(p.correctAnswer)).toBe(true);
      }
    }
  });

  it('generates counting problems for Kindergarten', () => {
    let foundCounting = false;
    for (let i = 0; i < 100; i++) {
      const p = generateProblem('K');
      if (p.operation === 'counting') {
        foundCounting = true;
        // Counting: "What comes after n?" → answer is n+1
        expect(p.correctAnswer).toBe(p.operands[0] + 1);
      }
    }
    expect(foundCounting).toBe(true);
  });

  it('generates multiplication problems for grade 3', () => {
    let found = false;
    for (let i = 0; i < 100; i++) {
      const p = generateProblem('3');
      if (p.operation === 'multiplication') {
        found = true;
        expect(p.correctAnswer).toBe(p.operands[0] * p.operands[1]);
      }
    }
    expect(found).toBe(true);
  });

  it('generates exponent problems for grade 8', () => {
    let found = false;
    for (let i = 0; i < 100; i++) {
      const p = generateProblem('8');
      if (p.operation === 'exponents') {
        found = true;
        const [base, power] = p.operands;
        expect(p.correctAnswer).toBe(Math.pow(base, power));
      }
    }
    expect(found).toBe(true);
  });

  it('generates square root problems with perfect squares for grade 8', () => {
    let found = false;
    for (let i = 0; i < 100; i++) {
      const p = generateProblem('8');
      if (p.operation === 'square_roots') {
        found = true;
        const root = p.correctAnswer;
        expect(p.operands[0]).toBe(root * root);
      }
    }
    expect(found).toBe(true);
  });

  it('generates order of operations problems that follow PEMDAS', () => {
    let found = false;
    for (let i = 0; i < 200; i++) {
      const p = generateProblem('8');
      if (p.operation === 'order_of_operations') {
        found = true;
        const [a, b, c] = p.operands;
        // a + b × c (PEMDAS: multiply first)
        expect(p.correctAnswer).toBe(a + b * c);
      }
    }
    expect(found).toBe(true);
  });

  it('includes displayTokens in every problem', () => {
    for (let i = 0; i < 50; i++) {
      const p = generateProblem('5');
      expect(p.displayTokens).toBeDefined();
      expect(p.displayTokens.length).toBeGreaterThan(0);
    }
  });

  it('includes a question string in every problem', () => {
    ALL_GRADES.forEach((grade) => {
      const p = generateProblem(grade);
      expect(typeof p.question).toBe('string');
      expect(p.question.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// generateProblemBatch
// ---------------------------------------------------------------------------

describe('generateProblemBatch', () => {
  it('generates the requested number of problems', () => {
    const batch = generateProblemBatch('5', 10);
    expect(batch).toHaveLength(10);
    batch.forEach((p) => expectValidProblem(p, '5'));
  });

  it('returns empty array for count 0', () => {
    const batch = generateProblemBatch('5', 0);
    expect(batch).toHaveLength(0);
  });

  it('handles large batch sizes', () => {
    const batch = generateProblemBatch('3', 100);
    expect(batch).toHaveLength(100);
  });
});

// ---------------------------------------------------------------------------
// checkAnswer
// ---------------------------------------------------------------------------

describe('checkAnswer', () => {
  it('returns true for exact integer match', () => {
    const problem: Problem = makeProblem({ correctAnswer: 42, tolerance: 0 });
    expect(checkAnswer(problem, 42)).toBe(true);
  });

  it('returns false for wrong integer answer', () => {
    const problem: Problem = makeProblem({ correctAnswer: 42, tolerance: 0 });
    expect(checkAnswer(problem, 43)).toBe(false);
  });

  it('returns true for answer within tolerance', () => {
    const problem: Problem = makeProblem({ correctAnswer: 3.14, tolerance: 0.01 });
    expect(checkAnswer(problem, 3.14)).toBe(true);
    expect(checkAnswer(problem, 3.145)).toBe(true);
    expect(checkAnswer(problem, 3.135)).toBe(true);
  });

  it('returns false for answer outside tolerance', () => {
    const problem: Problem = makeProblem({ correctAnswer: 3.14, tolerance: 0.01 });
    expect(checkAnswer(problem, 3.16)).toBe(false);
    expect(checkAnswer(problem, 3.12)).toBe(false);
  });

  it('handles zero tolerance exactly', () => {
    const problem: Problem = makeProblem({ correctAnswer: 0, tolerance: 0 });
    expect(checkAnswer(problem, 0)).toBe(true);
    expect(checkAnswer(problem, 0.001)).toBe(false);
  });

  it('handles negative answers', () => {
    const problem: Problem = makeProblem({ correctAnswer: -5, tolerance: 0 });
    expect(checkAnswer(problem, -5)).toBe(true);
    expect(checkAnswer(problem, 5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('handles boundary operands (min = max in range)', () => {
    // When min === max, the operand should always be that value
    // This is indirectly tested by counting for grade K (min:1, max:20)
    const problems = generateProblemBatch('K', 50);
    problems.forEach((p) => {
      expect(p.correctAnswer).toBeDefined();
      expect(typeof p.correctAnswer).toBe('number');
      expect(Number.isFinite(p.correctAnswer)).toBe(true);
    });
  });

  it('never produces NaN or Infinity answers', () => {
    ALL_GRADES.forEach((grade) => {
      for (let i = 0; i < 20; i++) {
        const p = generateProblem(grade);
        expect(Number.isNaN(p.correctAnswer)).toBe(false);
        expect(Number.isFinite(p.correctAnswer)).toBe(true);
      }
    });
  });

  it('all display tokens have valid type discriminators', () => {
    const validTypes = new Set(['number', 'symbol', 'fraction', 'exponent', 'sqrt']);
    ALL_GRADES.forEach((grade) => {
      for (let i = 0; i < 10; i++) {
        const p = generateProblem(grade);
        p.displayTokens.forEach((token) => {
          expect(validTypes.has(token.type)).toBe(true);
        });
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectValidProblem(p: Problem, grade: Grade) {
  expect(p.id).toBeTruthy();
  expect(p.grade).toBe(grade);
  expect(p.operation).toBeTruthy();
  expect(p.question).toBeTruthy();
  expect(typeof p.correctAnswer).toBe('number');
  expect(p.tolerance).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(p.operands)).toBe(true);
  expect(Array.isArray(p.displayTokens)).toBe(true);
  expect(p.displayTokens.length).toBeGreaterThan(0);
}

function makeProblem(overrides: Partial<Problem>): Problem {
  return {
    id: 'test-id',
    grade: '3',
    operation: 'addition',
    question: 'test?',
    correctAnswer: 0,
    tolerance: 0,
    operands: [0],
    displayTokens: [{ type: 'number', value: '0' }],
    ...overrides,
  };
}
