import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import styles from './Review.module.css';

export default function Review() {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [aiSentence, setAiSentence] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/review/due').then(res => {
      setQueue(res.data.due);
    }).finally(() => setLoading(false));
  }, []);

  const handleReveal = () => setRevealed(true);

  const handleRating = async (rating) => {
    const word = queue[current];
    setLoadingAI(rating === 1);
    setAiSentence(null);

    try {
      const res = await api.post('/review/submit', { word_id: word.id, rating });

      if (rating === 1 && res.data.aiSentence) {
        setAiSentence(res.data.aiSentence);
        return; // Stay on card, show AI sentence
      }

      goNext();
    } catch (err) {
      console.error('Submit error:', err);
      goNext();
    } finally {
      setLoadingAI(false);
    }
  };

  const goNext = () => {
    setAiSentence(null);
    setRevealed(false);
    if (current + 1 >= queue.length) {
      setDone(true);
    } else {
      setCurrent(prev => prev + 1);
    }
  };

  if (loading) return <div className="loading">Loading your review session...</div>;

  if (queue.length === 0) {
    return (
      <div className="page">
        <div className={`card ${styles.empty}`}>
          <span className={styles.emptyIcon}>✅</span>
          <h2>All caught up!</h2>
          <p>No words due for review right now. Come back later or add more words.</p>
          <div className={styles.emptyActions}>
            <button className="btn-primary" onClick={() => navigate('/add')}>Add words</button>
            <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="page">
        <div className={`card ${styles.empty}`}>
          <span className={styles.emptyIcon}>🎉</span>
          <h2>Session complete!</h2>
          <p>You reviewed {queue.length} word{queue.length > 1 ? 's' : ''}. Great work!</p>
          <div className={styles.emptyActions}>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const word = queue[current];
  const progress = Math.round(((current) / queue.length) * 100);

  return (
    <div className="page">
      <div className={styles.progressRow}>
        <span className={styles.progressLabel}>{current + 1} / {queue.length}</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={`card ${styles.flashcard}`}>
        <div className={styles.category}>{word.category_name || 'General'}</div>
        <div className={styles.german}>{word.german}</div>

        {!revealed ? (
          <button className={`btn-primary ${styles.revealBtn}`} onClick={handleReveal}>
            Show answer
          </button>
        ) : (
          <>
            <div className={styles.divider} />
            <div className={styles.english}>{word.english}</div>

            {/* AI sentence shown when user rated 1 */}
            {aiSentence && (
              <div className={styles.aiBox}>
                <div className={styles.aiLabel}>💡 Example sentence</div>
                <p className={styles.aiSentence}>{aiSentence.sentence}</p>
                <p className={styles.aiTranslation}>{aiSentence.translation}</p>
                <button className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={goNext}>
                  Continue →
                </button>
              </div>
            )}

            {loadingAI && (
              <div className={styles.aiBox}>
                <p className={styles.aiLabel}>💡 Generating example sentence...</p>
              </div>
            )}

            {!aiSentence && !loadingAI && (
              <>
                <p className={styles.ratingLabel}>How well did you remember?</p>
                <div className={styles.ratings}>
                  <button className="btn-danger" onClick={() => handleRating(1)}>
                    <span>1</span> Forgot
                  </button>
                  <button className="btn-amber" onClick={() => handleRating(2)}>
                    <span>2</span> Hard
                  </button>
                  <button className="btn-secondary" onClick={() => handleRating(3)}>
                    <span>3</span> Good
                  </button>
                  <button className="btn-green" onClick={() => handleRating(4)}>
                    <span>4</span> Easy
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}