// calculator-reducer.ts — Pure state machine for a basic arithmetic calculator

export type Operator = '+' | '-' | '*' | '/';

export interface CalculatorState {
  /** Value currently shown on the display */
  display: string;
  /** First operand stored when an operator is pressed */
  operand: number | null;
  /** The pending operator awaiting the second operand */
  operator: Operator | null;
  /** When true, the next digit replaces the display instead of appending */
  resetDisplay: boolean;
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'operator'; operator: Operator }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'decimal' };

export const initialState: CalculatorState = {
  display: '0',
  operand: null,
  operator: null,
  resetDisplay: false,
};

function evaluate(a: number, op: Operator, b: number): string {
  switch (op) {
    case '+':
      return String(a + b);
    case '-':
      return String(a - b);
    case '*':
      return String(a * b);
    case '/':
      return b === 0 ? 'Error' : String(a / b);
  }
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case 'digit': {
      // If display shows an error, start fresh
      if (state.display === 'Error') {
        return { ...initialState, display: action.digit };
      }
      if (state.resetDisplay) {
        return { ...state, display: action.digit, resetDisplay: false };
      }
      // Replace leading zero, but keep "0." intact
      const newDisplay =
        state.display === '0' ? action.digit : state.display + action.digit;
      return { ...state, display: newDisplay };
    }

    case 'decimal': {
      if (state.display === 'Error') {
        return { ...initialState, display: '0.' };
      }
      if (state.resetDisplay) {
        return { ...state, display: '0.', resetDisplay: false };
      }
      // Guard: only one decimal point per operand
      if (state.display.includes('.')) {
        return state;
      }
      return { ...state, display: state.display + '.' };
    }

    case 'operator': {
      if (state.display === 'Error') {
        return state;
      }
      const current = parseFloat(state.display);

      // If there's a pending operation, chain it
      if (state.operator !== null && state.operand !== null && !state.resetDisplay) {
        const result = evaluate(state.operand, state.operator, current);
        if (result === 'Error') {
          return { ...initialState, display: 'Error' };
        }
        return {
          display: result,
          operand: parseFloat(result),
          operator: action.operator,
          resetDisplay: true,
        };
      }

      return {
        ...state,
        operand: current,
        operator: action.operator,
        resetDisplay: true,
      };
    }

    case 'equals': {
      if (state.display === 'Error') {
        return state;
      }
      if (state.operator === null || state.operand === null) {
        return state;
      }
      const current = parseFloat(state.display);
      const result = evaluate(state.operand, state.operator, current);
      return {
        display: result,
        operand: null,
        operator: null,
        resetDisplay: true,
      };
    }

    case 'clear': {
      return { ...initialState };
    }

    default:
      return state;
  }
}
