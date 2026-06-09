import { describe, it, expect } from 'vitest';
import { partitionStagingData } from './compile_datasets.js';

describe('Dataset Partitioning Logic', () => {
  it('should split staging data into 20% test and 80% train sets deterministically', () => {
    const dummyExtractions = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    
    const { stagingTestSet, stagingTrainSet } = partitionStagingData(dummyExtractions);
    
    expect(stagingTestSet.length).toBe(20);
    expect(stagingTrainSet.length).toBe(80);
    
    // First item (index 0) should be in the test set
    expect(stagingTestSet[0].id).toBe(0);
    // Second item (index 1) should be in the training set
    expect(stagingTrainSet[0].id).toBe(1);
  });
});
