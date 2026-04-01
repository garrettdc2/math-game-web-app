import { render, screen, fireEvent } from '@testing-library/react';
import GradeSelector from '../GradeSelector';

describe('GradeSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Grid mode (default)', () => {
    it('renders all 13 grade buttons', () => {
      render(<GradeSelector onSelect={mockOnSelect} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(13);
    });

    it('shows grade labels', () => {
      render(<GradeSelector onSelect={mockOnSelect} />);
      expect(screen.getByText('Kindergarten')).toBeInTheDocument();
      expect(screen.getByText('1st Grade')).toBeInTheDocument();
      expect(screen.getByText('5th Grade')).toBeInTheDocument();
      expect(screen.getByText('12th Grade')).toBeInTheDocument();
    });

    it('shows topic descriptions', () => {
      render(<GradeSelector onSelect={mockOnSelect} />);
      expect(screen.getByText('Counting & Basic Shapes')).toBeInTheDocument();
      expect(screen.getByText('Addition & Subtraction to 20')).toBeInTheDocument();
      expect(screen.getByText('Pre-Calculus & Advanced Topics')).toBeInTheDocument();
    });

    it('calls onSelect with grade value on click', () => {
      render(<GradeSelector onSelect={mockOnSelect} />);
      const kButton = screen.getByText('Kindergarten').closest('button')!;
      fireEvent.click(kButton);
      expect(mockOnSelect).toHaveBeenCalledWith('K');
    });

    it('calls onSelect with numeric grade', () => {
      render(<GradeSelector onSelect={mockOnSelect} />);
      const grade5Button = screen.getByText('5th Grade').closest('button')!;
      fireEvent.click(grade5Button);
      expect(mockOnSelect).toHaveBeenCalledWith('5');
    });

    it('shows checkmark for selected grade', () => {
      render(<GradeSelector selectedGrade="3" onSelect={mockOnSelect} />);
      const grade3Button = screen.getByText('3rd Grade').closest('button')!;
      const svg = grade3Button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('does not show checkmark for non-selected grades', () => {
      render(<GradeSelector selectedGrade="3" onSelect={mockOnSelect} />);
      const grade5Button = screen.getByText('5th Grade').closest('button')!;
      const svg = grade5Button.querySelector('svg');
      expect(svg).toBeNull();
    });

    it('renders without selectedGrade', () => {
      render(<GradeSelector onSelect={mockOnSelect} />);
      expect(screen.getAllByRole('button')).toHaveLength(13);
    });
  });

  describe('Compact mode', () => {
    it('renders select dropdown', () => {
      render(<GradeSelector compact onSelect={mockOnSelect} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('has all grade options', () => {
      render(<GradeSelector compact onSelect={mockOnSelect} />);
      const options = screen.getAllByRole('option');
      // 13 grades + "Select Grade" placeholder
      expect(options).toHaveLength(14);
    });

    it('onChange calls onSelect with grade value', () => {
      render(<GradeSelector compact onSelect={mockOnSelect} />);
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '6' } });
      expect(mockOnSelect).toHaveBeenCalledWith('6');
    });

    it('shows selected grade value', () => {
      render(<GradeSelector compact selectedGrade="8" onSelect={mockOnSelect} />);
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('8');
    });
  });
});
