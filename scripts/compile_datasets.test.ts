import { describe, it, expect } from 'vitest';
import {
  partitionStagingData,
  validateLabels,
  isBalanced,
  stratifyAndSplit
} from './compile_datasets.js';

describe('Dataset Partitioning & Validation Logic', () => {
  it('should validate that all labels strictly belong to the 4 cognitive classes', () => {
    const validData = [
      { label: 'deep_work' },
      { label: 'informational' },
      { label: 'communication' },
      { label: 'noise' }
    ];
    const invalidData = [
      { label: 'deep_work' },
      { label: 'sensitive_portal' } // Legacy label
    ];
    
    expect(validateLabels(validData)).toBe(true);
    expect(validateLabels(invalidData)).toBe(false);
  });

  it('should verify dataset class distribution balance', () => {
    // Balanced dataset (equal distribution)
    const balancedData = [
      ...Array.from({ length: 150 }, () => ({ label: 'deep_work' })),
      ...Array.from({ length: 160 }, () => ({ label: 'informational' })),
      ...Array.from({ length: 170 }, () => ({ label: 'communication' })),
      ...Array.from({ length: 180 }, () => ({ label: 'noise' }))
    ];
    
    // Imbalanced dataset (noise dominates)
    const imbalancedData = [
      ...Array.from({ length: 50 }, () => ({ label: 'deep_work' })),
      ...Array.from({ length: 50 }, () => ({ label: 'informational' })),
      ...Array.from({ length: 50 }, () => ({ label: 'communication' })),
      ...Array.from({ length: 300 }, () => ({ label: 'noise' }))
    ];
    
    expect(isBalanced(balancedData)).toBe(true);
    expect(isBalanced(imbalancedData)).toBe(false);
  });

  it('should perform stratified 80/20 train/test split with no leakage', () => {
    // 100 items distributed evenly
    const dummyExtractions = [
      ...Array.from({ length: 25 }, (_, i) => ({ id: `dw-${i}`, label: 'deep_work' })),
      ...Array.from({ length: 25 }, (_, i) => ({ id: `inf-${i}`, label: 'informational' })),
      ...Array.from({ length: 25 }, (_, i) => ({ id: `comm-${i}`, label: 'communication' })),
      ...Array.from({ length: 25 }, (_, i) => ({ id: `n-${i}`, label: 'noise' }))
    ];
    
    const { stagingTestSet, stagingTrainSet } = stratifyAndSplit(dummyExtractions, 0.2);
    
    // Check sizes (20% test, 80% train)
    expect(stagingTestSet.length).toBe(20);
    expect(stagingTrainSet.length).toBe(80);
    
    // Check stratification (each class should have exactly 5 in test and 20 in train)
    const testCounts = stagingTestSet.reduce((acc: any, item: any) => {
      acc[item.label] = (acc[item.label] || 0) + 1;
      return acc;
    }, {});
    
    expect(testCounts['deep_work']).toBe(5);
    expect(testCounts['informational']).toBe(5);
    expect(testCounts['communication']).toBe(5);
    expect(testCounts['noise']).toBe(5);
    
    // Check for leakage (no item in test set should be in train set)
    const testIds = new Set(stagingTestSet.map((x: any) => x.id));
    const hasLeak = stagingTrainSet.some((x: any) => testIds.has(x.id));
    expect(hasLeak).toBe(false);
  });
});
