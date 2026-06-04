const { calculateNextReview, getLastReviewState } = require('../src/services/srsAlgorithm');

describe('calculateNextReview', () => {
  it('resets interval to 1 day when rating is 1 (forgot)', () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 10, rating: 1 });
    expect(result.intervalDays).toBe(1);
  });

  it('slightly increases interval when rating is 2 (hard)', () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 10, rating: 2 });
    expect(result.intervalDays).toBeGreaterThan(10);
  });

  it('returns 3 days for first successful review (rating 3)', () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 1, rating: 3 });
    expect(result.intervalDays).toBe(3);
  });

  it('returns 7 days for second successful review (rating 3)', () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 3, rating: 3 });
    expect(result.intervalDays).toBe(7);
  });

  it('applies ease factor for longer intervals (rating 3)', () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 7, rating: 3 });
    expect(result.intervalDays).toBe(18); // 7 * 2.5 = 17.5 → 18
  });

  it('ease factor never drops below 1.3', () => {
    // Rating 1 repeatedly should floor at 1.3
    let ef = 2.5;
    for (let i = 0; i < 10; i++) {
      const result = calculateNextReview({ easeFactor: ef, intervalDays: 1, rating: 1 });
      ef = result.easeFactor;
    }
    expect(ef).toBeGreaterThanOrEqual(1.3);
  });

  it('increases ease factor for easy rating (4)', () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 7, rating: 4 });
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  it('decreases ease factor for hard rating (2)', () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 7, rating: 2 });
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it('returns a future date for nextReviewAt', () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 1, rating: 3 });
    expect(result.nextReviewAt).toBeInstanceOf(Date);
    expect(result.nextReviewAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('throws error for invalid rating', () => {
    expect(() => calculateNextReview({ easeFactor: 2.5, intervalDays: 1, rating: 5 }))
      .toThrow('Rating must be between 1 and 4.');
  });
});

describe('getLastReviewState', () => {
  it('returns defaults when no review history exists', () => {
    const result = getLastReviewState([]);
    expect(result.easeFactor).toBe(2.5);
    expect(result.intervalDays).toBe(1);
  });

  it('returns last review state from logs', () => {
    const logs = [
      { ease_factor: '1.8', interval_days: '14' },
      { ease_factor: '2.0', interval_days: '7' },
    ];
    const result = getLastReviewState(logs);
    expect(result.easeFactor).toBe(1.8);
    expect(result.intervalDays).toBe(14);
  });
});