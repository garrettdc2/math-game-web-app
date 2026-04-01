import { GRADE_CONFIGS, ALL_GRADE_CONFIGS } from '../commonCoreStandards';
import { ALL_GRADES } from '../types';
import type { GradeConfig } from '../types';

describe('commonCoreStandards', () => {
  describe('GRADE_CONFIGS', () => {
    it('has an entry for every grade K–12', () => {
      ALL_GRADES.forEach((grade) => {
        expect(GRADE_CONFIGS[grade]).toBeDefined();
        expect(GRADE_CONFIGS[grade].grade).toBe(grade);
      });
    });

    it('has exactly 13 grade configs', () => {
      expect(Object.keys(GRADE_CONFIGS)).toHaveLength(13);
    });

    it.each(ALL_GRADES)('grade "%s" has a non-empty label', (grade) => {
      expect(GRADE_CONFIGS[grade].label).toBeTruthy();
    });

    it.each(ALL_GRADES)('grade "%s" has a non-empty description', (grade) => {
      expect(GRADE_CONFIGS[grade].description).toBeTruthy();
    });

    it.each(ALL_GRADES)(
      'grade "%s" has at least one problem type',
      (grade) => {
        expect(GRADE_CONFIGS[grade].problemTypes.length).toBeGreaterThan(0);
      },
    );

    it('all problem types have positive weights', () => {
      ALL_GRADES.forEach((grade) => {
        GRADE_CONFIGS[grade].problemTypes.forEach((pt) => {
          expect(pt.weight).toBeGreaterThan(0);
        });
      });
    });

    it('all problem types have at least one operand range', () => {
      ALL_GRADES.forEach((grade) => {
        GRADE_CONFIGS[grade].problemTypes.forEach((pt) => {
          expect(pt.operandRanges.length).toBeGreaterThanOrEqual(1);
          pt.operandRanges.forEach((range) => {
            expect(range.min).toBeLessThanOrEqual(range.max);
          });
        });
      });
    });
  });

  describe('ALL_GRADE_CONFIGS', () => {
    it('is an array of 13 configs in grade order', () => {
      expect(ALL_GRADE_CONFIGS).toHaveLength(13);
      ALL_GRADE_CONFIGS.forEach((config, i) => {
        expect(config.grade).toBe(ALL_GRADES[i]);
      });
    });

    it('contains the same configs as GRADE_CONFIGS', () => {
      ALL_GRADE_CONFIGS.forEach((config) => {
        expect(GRADE_CONFIGS[config.grade]).toBe(config);
      });
    });
  });

  describe('grade-level content alignment', () => {
    it('Kindergarten includes counting', () => {
      const k = GRADE_CONFIGS['K'];
      const ops = k.problemTypes.map((pt) => pt.operation);
      expect(ops).toContain('counting');
    });

    it('Grade 3 introduces multiplication and division', () => {
      const g3 = GRADE_CONFIGS['3'];
      const ops = g3.problemTypes.map((pt) => pt.operation);
      expect(ops).toContain('multiplication');
      expect(ops).toContain('division');
    });

    it('Grade 5 includes fractions and decimals', () => {
      const g5 = GRADE_CONFIGS['5'];
      const ops = g5.problemTypes.map((pt) => pt.operation);
      expect(ops).toContain('fractions');
      expect(ops).toContain('decimals');
    });

    it('Grade 6 includes ratios and percentages', () => {
      const g6 = GRADE_CONFIGS['6'];
      const ops = g6.problemTypes.map((pt) => pt.operation);
      expect(ops).toContain('ratios');
      expect(ops).toContain('percentages');
    });

    it('Grade 8 includes exponents and square roots', () => {
      const g8 = GRADE_CONFIGS['8'];
      const ops = g8.problemTypes.map((pt) => pt.operation);
      expect(ops).toContain('exponents');
      expect(ops).toContain('square_roots');
    });

    it('Grade 9+ includes algebraic content', () => {
      const g9 = GRADE_CONFIGS['9'];
      const ops = g9.problemTypes.map((pt) => pt.operation);
      expect(ops).toContain('linear_equations');
      expect(ops).toContain('inequalities');
    });

    it('Grade 11+ includes logarithms', () => {
      const g11 = GRADE_CONFIGS['11'];
      const ops = g11.problemTypes.map((pt) => pt.operation);
      expect(ops).toContain('logarithms');
    });

    it('Grade 12 includes quadratic equations and trigonometry', () => {
      const g12 = GRADE_CONFIGS['12'];
      const ops = g12.problemTypes.map((pt) => pt.operation);
      expect(ops).toContain('quadratic_equations');
      expect(ops).toContain('trigonometry');
    });
  });

  describe('edge cases', () => {
    it('no grade has empty problemTypes array', () => {
      ALL_GRADE_CONFIGS.forEach((config) => {
        expect(config.problemTypes.length).toBeGreaterThan(0);
      });
    });

    it('operand ranges min <= max for all configs', () => {
      ALL_GRADE_CONFIGS.forEach((config) => {
        config.problemTypes.forEach((pt) => {
          pt.operandRanges.forEach((range) => {
            expect(range.min).toBeLessThanOrEqual(range.max);
          });
        });
      });
    });
  });
});
