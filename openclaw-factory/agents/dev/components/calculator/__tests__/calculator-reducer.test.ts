import {
  calculatorReducer,
  initialState,
  CalculatorState,
  CalculatorAction,
} from '../calculator-reducer';

// Helper: run a sequence of actions from initial state
function run(actions: CalculatorAction[], from: CalculatorState = initialState): CalculatorState {
  return actions.reduce((s, a) => calculatorReducer(s, a), from);
}

// Shorthand builders
const digit = (d: string): CalculatorAction => ({ type: 'digit', digit: d });
const op = (o: '+' | '-' | '*' | '/'): CalculatorAction => ({ type: 'operator', operator: o });
const eq: CalculatorAction = { type: 'equals' };
const clear: CalculatorAction = { type: 'clear' };
const decimal: CalculatorAction = { type: 'decimal' };

describe('calculatorReducer', () => {
  // ── Digit input ──────────────────────────────────────────────

  it('starts with display "0"', () => {
    expect(initialState.display).toBe('0');
  });

  it('replaces leading zero with first digit', () => {
    const state = calculatorReducer(initialState, digit('5'));
    expect(state.display).toBe('5');
  });

  it('appends subsequent digits', () => {
    const state = run([digit('1'), digit('2'), digit('3')]);
    expect(state.display).toBe('123');
  });

  it('starts a new number after an operator', () => {
    const state = run([digit('9'), op('+'), digit('3')]);
    expect(state.display).toBe('3');
  });

  // ── Operators ────────────────────────────────────────────────

  it('adds two numbers', () => {
    const state = run([digit('2'), op('+'), digit('3'), eq]);
    expect(state.display).toBe('5');
  });

  it('subtracts two numbers', () => {
    const state = run([digit('9'), op('-'), digit('4'), eq]);
    expect(state.display).toBe('5');
  });

  it('multiplies two numbers', () => {
    const state = run([digit('6'), op('*'), digit('7'), eq]);
    expect(state.display).toBe('42');
  });

  it('divides two numbers', () => {
    const state = run([digit('8'), op('/'), digit('2'), eq]);
    expect(state.display).toBe('4');
  });

  it('chains operators (evaluates pending op before applying new one)', () => {
    // 2 + 3 + → should show 5 after second +
    const state = run([digit('2'), op('+'), digit('3'), op('+')]);
    expect(state.display).toBe('5');
    // then 4 = → should show 9
    const final = run([digit('4'), eq], state);
    expect(final.display).toBe('9');
  });

  it('equals with no pending operator is a no-op', () => {
    const state = run([digit('5'), eq]);
    expect(state.display).toBe('5');
  });

  // ── Clear ────────────────────────────────────────────────────

  it('resets everything on clear', () => {
    const state = run([digit('9'), op('+'), digit('1'), clear]);
    expect(state).toEqual(initialState);
  });

  // ── Division by zero ─────────────────────────────────────────

  it('shows "Error" on division by zero', () => {
    const state = run([digit('5'), op('/'), digit('0'), eq]);
    expect(state.display).toBe('Error');
  });

  it('shows "Error" when chaining produces division by zero', () => {
    const state = run([digit('5'), op('/'), digit('0'), op('+')]);
    expect(state.display).toBe('Error');
  });

  it('allows digit input after Error to start fresh', () => {
    const errorState = run([digit('5'), op('/'), digit('0'), eq]);
    expect(errorState.display).toBe('Error');
    const state = calculatorReducer(errorState, digit('3'));
    expect(state.display).toBe('3');
    expect(state.operand).toBeNull();
    expect(state.operator).toBeNull();
  });

  it('ignores operator when display is Error', () => {
    const errorState = run([digit('5'), op('/'), digit('0'), eq]);
    const state = calculatorReducer(errorState, op('+'));
    expect(state.display).toBe('Error');
  });

  it('ignores equals when display is Error', () => {
    const errorState = run([digit('5'), op('/'), digit('0'), eq]);
    const state = calculatorReducer(errorState, eq);
    expect(state.display).toBe('Error');
  });

  // ── Decimal guard ────────────────────────────────────────────

  it('appends decimal point to display', () => {
    const state = run([digit('3'), decimal]);
    expect(state.display).toBe('3.');
  });

  it('prevents multiple decimal points in one operand', () => {
    const state = run([digit('3'), decimal, digit('1'), decimal, digit('4')]);
    expect(state.display).toBe('3.14');
  });

  it('allows decimal in second operand after operator', () => {
    const state = run([digit('1'), decimal, digit('5'), op('+'), decimal, digit('5')]);
    expect(state.display).toBe('0.5');
  });

  it('starts with "0." when decimal pressed on reset display', () => {
    const state = run([digit('5'), op('+'), decimal]);
    expect(state.display).toBe('0.');
  });

  it('starts with "0." when decimal pressed after Error', () => {
    const errorState = run([digit('5'), op('/'), digit('0'), eq]);
    const state = calculatorReducer(errorState, decimal);
    expect(state.display).toBe('0.');
  });

  // ── Multi-digit and edge cases ──────────────────────────────

  it('handles multi-digit operands', () => {
    const state = run([digit('1'), digit('2'), op('+'), digit('3'), digit('4'), eq]);
    expect(state.display).toBe('46');
  });

  it('handles decimal arithmetic', () => {
    const state = run([digit('0'), decimal, digit('1'), op('+'), digit('0'), decimal, digit('2'), eq]);
    expect(parseFloat(state.display)).toBeCloseTo(0.3);
  });

  it('starts new calculation after equals', () => {
    const state = run([digit('2'), op('+'), digit('3'), eq, digit('9')]);
    expect(state.display).toBe('9');
  });
});
