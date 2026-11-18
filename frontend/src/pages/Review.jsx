import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleCheck, PartyPopper, Sparkles, Volume2, X } from 'lucide-react';
import api from '../api/axios';
import GermanWord from '../components/GermanWord';
import { splitArticle, speak, formatInterval } from '../utils/german';
import styles from './Review.module.css';

const RATINGS = [
  { value: 1, label: 'Forgot', tone: 'forgot' },
  { value: 2, label: 'Hard', tone: 'hard' },
  { value: 3, label: 'Good', tone: 'good' },
  { value: 4, label: 'Easy', tone: 'easy' },
];

function Highlight({ sentence, word }) {
  const bare = splitArticle(word).noun;
  const escaped = bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = sentence.split(new RegExp(`(${escaped})`, 'i'));
  return parts.map((part, i) =>
    part.toLowerCase() === bare.toLowerCase()
      ? <mark key={i}>{part}</mark>
      : <span key={i}>{part}</span>
  );
}

export default function Review() {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [aiSentence, setAiSentence] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/review/due')
      .then((res) => setQueue(res.data.due))
      .catch(() => setError("Couldn't load your words. Refresh the page to try again."))
      .finally(() => setLoading(false));
  }, []);

  const goNext = () => {
    setAiSentence(null);
    setRevealed(false);
    setError('');
    if (current + 1 >= queue.length) setDone(true);
    else setCurrent((c) => c + 1);
  };

  const handleRating = async (rating) => {
    if (submitting) return;
    const word = queue[current];
    setSubmitting(true);
    setGenerating(rating === 1);
    setError('');

    try {
      const res = await api.post('/review/submit', { word_id: word.id, rating });
      setRatings((prev) => [...prev, rating]);
      if (rating === 1 && res.data.aiSentence) setAiSentence(res.data.aiSentence);
      else goNext();
    } catch {
      setError("Couldn't save that review. Check your connection and try again.");
    } finally {
      setSubmitting(false);
      setGenerating(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (loading || done || queue.length === 0) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (aiSentence) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goNext(); }
        return;
      }
      if (!revealed) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setRevealed(true); }
        return;
      }
      if (['1', '2', '3', '4'].includes(e.key)) handleRating(Number(e.key));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (loading) return <div className="loading">Loading your review session…</div>;

  if (error && queue.length === 0) {
    return (
      <div className="page">
        <div className={`card ${styles.empty}`}><p>{error}</p></div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="page">
        <div className={`card ${styles.empty}`}>
          <CircleCheck size={44} className={styles.emptyIcon} />
          <h2>All caught up</h2>
          <p>No words are due right now. Come back later or add more words.</p>
          <div className={styles.emptyActions}>
            <button className="btn-primary" onClick={() => navigate('/add')}>Add words</button>
            <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    const remembered = ratings.filter((r) => r >= 3).length;
    return (
      <div className="page">
        <div className={`card ${styles.empty}`}>
          <PartyPopper size={44} className={styles.emptyIcon} />
          <h2>Session complete</h2>
          <p>
            You reviewed {ratings.length} word{ratings.length !== 1 ? 's' : ''} and remembered {remembered}.
          </p>
          <div className={styles.emptyActions}>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const word = queue[current];
  const progress = Math.round((current / queue.length) * 100);

  return (
    <div className="page">
      <div className={styles.topRow}>
        <span className={styles.count}>{current + 1} / {queue.length}</span>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${progress}%` }} />
        </div>
        <button
          className={styles.exit}
          onClick={() => navigate('/dashboard')}
          aria-label="End session"
        >
          <X size={18} />
        </button>
      </div>

      <div className={`card ${styles.flashcard}`}>
        <span className="chip">{word.category_name || 'General'}</span>

        <div className={styles.wordRow}>
          <div className={styles.word}><GermanWord text={word.german} /></div>
          <button
            className={styles.speak}
            onClick={() => speak(word.german)}
            aria-label="Play pronunciation"
          >
            <Volume2 size={18} />
          </button>
        </div>

        {!revealed && (
          <div className={styles.stack}>
            <button className="btn-primary" onClick={() => setRevealed(true)}>Show answer</button>
            <span className={styles.hint}>or press space</span>
          </div>
        )}

        {revealed && (
          <div className={styles.stack}>
            <div className={styles.divider} />
            <div className={styles.english}>{word.english}</div>

            {generating && (
              <div className={styles.aiBox}>
                <div className={styles.aiLabel}><Sparkles size={14} /> Generating an example sentence…</div>
              </div>
            )}

            {aiSentence && (
              <div className={styles.aiBox}>
                <div className={styles.aiLabel}><Sparkles size={14} /> Example sentence</div>
                <p className={styles.aiSentence}>
                  <Highlight sentence={aiSentence.sentence} word={word.german} />
                </p>
                <p className={styles.aiTranslation}>{aiSentence.translation}</p>
                <button className="btn-primary" onClick={goNext}>Continue</button>
              </div>
            )}

            {!aiSentence && !generating && (
              <>
                <p className={styles.ask}>How well did you remember? Press 1 to 4.</p>
                <div className={styles.ratings}>
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      className={`${styles.rate} ${styles[r.tone]}`}
                      onClick={() => handleRating(r.value)}
                      disabled={submitting}
                    >
                      <span className={styles.rateKey}>{r.value}</span>
                      <span className={styles.rateLabel}>{r.label}</span>
                      {word.previews && (
                        <span className={styles.rateWhen}>{formatInterval(word.previews[r.value])}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {error && <div className="error-msg" style={{ marginTop: '0.75rem' }}>{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}