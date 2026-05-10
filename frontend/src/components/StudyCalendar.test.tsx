import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudyCalendar } from './StudyCalendar';

vi.mock('../utils/settings', () => ({
  useSettings: () => ({
    language: 'en',
    tokens: {
      accentPrimary: '#4f46e5',
      accentPrimarySoft: '#e0e7ff',
      accentSecondary: '#10b981',
      hoverSurface: '#f3f4f6',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      textInverted: '#ffffff',
      surface: '#ffffff',
      surfaceMuted: '#f9fafb',
      surfaceAccent: '#eef2ff',
      borderSoft: '1px solid #e5e7eb',
      borderStrong: '1px solid #d1d5db',
      shadow: 'none',
      success: '#16a34a',
      danger: '#dc2626',
      info: '#2563eb',
    },
    t: (_zh: string, en: string) => en,
  }),
}));

describe('StudyCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 8, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('supports moving between months', () => {
    render(<StudyCalendar events={[]} />);

    expect(screen.getByText('2026 May')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('2026 Jun')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('2026 Apr')).toBeInTheDocument();
  });
});
