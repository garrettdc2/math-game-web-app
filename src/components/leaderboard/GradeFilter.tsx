'use client';

import { type Grade } from '@/hooks/useLeaderboard';

const GRADES: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

interface GradeFilterProps {
  selectedGrade: Grade;
  onGradeChange: (grade: Grade) => void;
}

export default function GradeFilter({ selectedGrade, onGradeChange }: GradeFilterProps) {
  return (
    <div className="w-full">
      <label htmlFor="grade-filter" className="block text-sm font-medium text-gray-400 mb-2">
        Filter by Grade
      </label>
      <div className="flex flex-wrap gap-2">
        {GRADES.map((grade) => {
          const isSelected = grade === selectedGrade;
          return (
            <button
              key={grade}
              onClick={() => onGradeChange(grade)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200
                ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`Grade ${grade}`}
            >
              {grade === 'K' ? 'K' : grade}
            </button>
          );
        })}
      </div>
    </div>
  );
}
