// Mock the useLeaderboard import that GradeFilter uses for the Grade type
jest.mock('@/hooks/useLeaderboard', () => ({
  __esModule: true,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import GradeFilter from '../GradeFilter';

describe('GradeFilter', () => {
  const mockOnGradeChange = jest.fn();
  const allGrades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  beforeEach(() => {
    mockOnGradeChange.mockClear();
  });

  it('renders a button for every grade K–12', () => {
    render(
      <GradeFilter selectedGrade="3" onGradeChange={mockOnGradeChange} />,
    );
    allGrades.forEach((grade) => {
      expect(screen.getByLabelText(`Grade ${grade}`)).toBeInTheDocument();
    });
  });

  it('renders exactly 13 grade buttons', () => {
    render(
      <GradeFilter selectedGrade="K" onGradeChange={mockOnGradeChange} />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(13);
  });

  it('marks the selected grade with aria-pressed=true', () => {
    render(
      <GradeFilter selectedGrade="5" onGradeChange={mockOnGradeChange} />,
    );
    const selectedButton = screen.getByLabelText('Grade 5');
    expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks non-selected grades with aria-pressed=false', () => {
    render(
      <GradeFilter selectedGrade="5" onGradeChange={mockOnGradeChange} />,
    );
    const otherButton = screen.getByLabelText('Grade 3');
    expect(otherButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onGradeChange with the clicked grade', () => {
    render(
      <GradeFilter selectedGrade="K" onGradeChange={mockOnGradeChange} />,
    );
    fireEvent.click(screen.getByLabelText('Grade 8'));
    expect(mockOnGradeChange).toHaveBeenCalledWith('8');
  });

  it('calls onGradeChange with "K" when Kindergarten is clicked', () => {
    render(
      <GradeFilter selectedGrade="5" onGradeChange={mockOnGradeChange} />,
    );
    fireEvent.click(screen.getByLabelText('Grade K'));
    expect(mockOnGradeChange).toHaveBeenCalledWith('K');
  });

  it('has a "Filter by Grade" label', () => {
    render(
      <GradeFilter selectedGrade="K" onGradeChange={mockOnGradeChange} />,
    );
    expect(screen.getByText('Filter by Grade')).toBeInTheDocument();
  });
});
