'use client';

import { useState } from 'react';

export type GradeLevel =
  | 'K'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12';

const GRADES: GradeLevel[] = [
  'K',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

const GRADE_LABELS: Record<GradeLevel, string> = {
  K: 'Kindergarten',
  '1': '1st Grade',
  '2': '2nd Grade',
  '3': '3rd Grade',
  '4': '4th Grade',
  '5': '5th Grade',
  '6': '6th Grade',
  '7': '7th Grade',
  '8': '8th Grade',
  '9': '9th Grade',
  '10': '10th Grade',
  '11': '11th Grade',
  '12': '12th Grade',
};

const GRADE_TOPICS: Record<GradeLevel, string> = {
  K: 'Counting & Basic Shapes',
  '1': 'Addition & Subtraction to 20',
  '2': 'Place Value & Measurement',
  '3': 'Multiplication & Fractions Intro',
  '4': 'Multi-digit Arithmetic & Fractions',
  '5': 'Decimals & Volume',
  '6': 'Ratios & Expressions',
  '7': 'Proportions & Geometry',
  '8': 'Linear Equations & Functions',
  '9': 'Algebra I',
  '10': 'Geometry & Trigonometry',
  '11': 'Algebra II & Statistics',
  '12': 'Pre-Calculus & Advanced Topics',
};

interface GradeSelectorProps {
  selectedGrade?: GradeLevel | null;
  onSelect: (grade: GradeLevel) => void;
  compact?: boolean;
}

export default function GradeSelector({
  selectedGrade,
  onSelect,
  compact = false,
}: GradeSelectorProps) {
  const [hoveredGrade, setHoveredGrade] = useState<GradeLevel | null>(null);

  if (compact) {
    return (
      <select
        value={selectedGrade ?? ''}
        onChange={(e) => onSelect(e.target.value as GradeLevel)}
        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:border-purple-400/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
      >
        <option value="" disabled>
          Select Grade
        </option>
        {GRADES.map((grade) => (
          <option key={grade} value={grade} className="bg-gray-900 text-white">
            {GRADE_LABELS[grade]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {GRADES.map((grade) => {
          const isSelected = selectedGrade === grade;
          const isHovered = hoveredGrade === grade;

          return (
            <button
              key={grade}
              onClick={() => onSelect(grade)}
              onMouseEnter={() => setHoveredGrade(grade)}
              onMouseLeave={() => setHoveredGrade(null)}
              className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                  : 'border-white/10 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 opacity-0 transition-opacity ${
                  isSelected || isHovered ? 'opacity-100' : ''
                }`}
              />
              <div className="relative">
                <div
                  className={`text-2xl font-bold ${
                    isSelected ? 'text-purple-300' : 'text-white'
                  }`}
                >
                  {grade === 'K' ? 'K' : grade}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {GRADE_LABELS[grade]}
                </div>
                <div className="mt-2 text-[10px] leading-tight text-gray-500">
                  {GRADE_TOPICS[grade]}
                </div>
              </div>
              {isSelected && (
                <div className="absolute right-2 top-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
