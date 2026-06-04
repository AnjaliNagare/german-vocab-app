/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Rating scale (shown to user as buttons):
 *   1 = Forgot completely
 *   2 = Hard — remembered with difficulty
 *   3 = Good — remembered with some effort
 *   4 = Easy — remembered instantly
 *
 * Returns: { nextReviewAt, intervalDays, easeFactor }
 */

function calculateNextReview({ easeFactor = 2.5, intervalDays = 1, rating }) {
  if (rating < 1 || rating > 4) {
    throw new Error('Rating must be between 1 and 4.');
  }

  let newInterval;
  let newEaseFactor = easeFactor;

  if (rating === 1) {
    // Forgot — reset to beginning
    newInterval = 1;
  } else if (rating === 2) {
    // Hard — stay at same interval
    newInterval = Math.max(1, Math.round(intervalDays * 1.2));
  } else {
    // Good or Easy — apply SM-2 formula
    if (intervalDays === 1) {
      newInterval = 3;
    } else if (intervalDays === 3) {
      newInterval = 7;
    } else {
      newInterval = Math.round(intervalDays * newEaseFactor);
    }
  }

  // Adjust ease factor based on rating
  // SM-2 formula: EF' = EF + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02))
  newEaseFactor = easeFactor + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02));

  // Ease factor never drops below 1.3
  newEaseFactor = Math.max(1.3, parseFloat(newEaseFactor.toFixed(2)));

  // Calculate next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    nextReviewAt,
    intervalDays: newInterval,
    easeFactor: newEaseFactor,
  };
}

/**
 * Get the last review state for a word from review_logs.
 * If no history exists, return fresh defaults.
 */
function getLastReviewState(reviewLogs) {
  if (!reviewLogs || reviewLogs.length === 0) {
    return { easeFactor: 2.5, intervalDays: 1 };
  }

  // reviewLogs should be sorted newest first
  const last = reviewLogs[0];
  return {
    easeFactor: parseFloat(last.ease_factor),
    intervalDays: parseInt(last.interval_days),
  };
}

module.exports = { calculateNextReview, getLastReviewState };