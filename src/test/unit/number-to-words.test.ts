import { describe, it, expect } from 'vitest';
import { numberToIndianWords } from '@/lib/utils/number-to-words';

describe('numberToIndianWords (Indian Numbering System)', () => {
  it('handles zero and edge values', () => {
    expect(numberToIndianWords(0)).toBe('Zero Rupees Only');
    expect(numberToIndianWords(NaN)).toBe('Zero Rupees Only');
  });

  it('converts small amounts', () => {
    expect(numberToIndianWords(5)).toBe('Rupees Five Only');
    expect(numberToIndianWords(45)).toBe('Rupees Forty Five Only');
    expect(numberToIndianWords(500)).toBe('Rupees Five Hundred Only');
    expect(numberToIndianWords(750)).toBe('Rupees Seven Hundred Fifty Only');
  });

  it('converts thousands', () => {
    expect(numberToIndianWords(1500)).toBe('Rupees One Thousand Five Hundred Only');
    expect(numberToIndianWords(15400)).toBe('Rupees Fifteen Thousand Four Hundred Only');
  });

  it('converts lakhs and crores', () => {
    expect(numberToIndianWords(100000)).toBe('Rupees One Lakh Only');
    expect(numberToIndianWords(2500000)).toBe('Rupees Twenty Five Lakh Only');
    expect(numberToIndianWords(10000000)).toBe('Rupees One Crore Only');
  });

  it('handles amounts with paise', () => {
    expect(numberToIndianWords(1500.50)).toBe('Rupees One Thousand Five Hundred and Fifty Paise Only');
    expect(numberToIndianWords(0.75)).toBe('Seventy Five Paise Only');
  });
});
