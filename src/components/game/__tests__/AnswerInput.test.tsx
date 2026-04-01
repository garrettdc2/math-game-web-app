import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnswerInput from '../AnswerInput';

describe('AnswerInput', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders an input and submit button', () => {
    render(<AnswerInput onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText('Answer input')).toBeInTheDocument();
    expect(screen.getByLabelText('Submit answer')).toBeInTheDocument();
  });

  it('shows "Your answer" placeholder when enabled', () => {
    render(<AnswerInput onSubmit={mockOnSubmit} />);
    expect(screen.getByPlaceholderText('Your answer')).toBeInTheDocument();
  });

  it('shows "..." placeholder when disabled', () => {
    render(<AnswerInput onSubmit={mockOnSubmit} disabled />);
    expect(screen.getByPlaceholderText('...')).toBeInTheDocument();
  });

  it('calls onSubmit with trimmed value on form submit', async () => {
    const user = userEvent.setup();
    render(<AnswerInput onSubmit={mockOnSubmit} />);
    const input = screen.getByLabelText('Answer input');

    await user.type(input, '  42  ');
    await user.click(screen.getByLabelText('Submit answer'));

    expect(mockOnSubmit).toHaveBeenCalledWith('42');
  });

  it('calls onSubmit on Enter key press', async () => {
    const user = userEvent.setup();
    render(<AnswerInput onSubmit={mockOnSubmit} />);
    const input = screen.getByLabelText('Answer input');

    await user.type(input, '7');
    await user.keyboard('{Enter}');

    expect(mockOnSubmit).toHaveBeenCalledWith('7');
  });

  it('does not submit empty input', async () => {
    const user = userEvent.setup();
    render(<AnswerInput onSubmit={mockOnSubmit} />);
    await user.click(screen.getByLabelText('Submit answer'));
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('does not submit whitespace-only input', async () => {
    const user = userEvent.setup();
    render(<AnswerInput onSubmit={mockOnSubmit} />);
    const input = screen.getByLabelText('Answer input');

    await user.type(input, '   ');
    await user.keyboard('{Enter}');

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('does not submit when disabled', async () => {
    const user = userEvent.setup();
    render(<AnswerInput onSubmit={mockOnSubmit} disabled />);
    const input = screen.getByLabelText('Answer input');

    // Input is disabled, but we can still try to type
    expect(input).toBeDisabled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('clears value when resetKey changes', () => {
    const { rerender } = render(
      <AnswerInput onSubmit={mockOnSubmit} resetKey="a" />,
    );
    const input = screen.getByLabelText('Answer input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '42' } });
    expect(input.value).toBe('42');

    rerender(<AnswerInput onSubmit={mockOnSubmit} resetKey="b" />);
    expect(input.value).toBe('');
  });

  it('has inputMode="decimal" for mobile numeric keyboard', () => {
    render(<AnswerInput onSubmit={mockOnSubmit} />);
    const input = screen.getByLabelText('Answer input');
    expect(input).toHaveAttribute('inputMode', 'decimal');
  });

  it('disables submit button when input is empty', () => {
    render(<AnswerInput onSubmit={mockOnSubmit} />);
    const button = screen.getByLabelText('Submit answer');
    expect(button).toBeDisabled();
  });
});
