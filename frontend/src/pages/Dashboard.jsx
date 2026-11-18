import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Repeat, Clock, Flame, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import styles from './Dashboard.module.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/review/stats')
      .then((res) => setStats(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading your dashboard…</div>;

  if (error || !stats) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Couldn't load your dashboard. Refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  const { totalWords, totalReviews, dueToday, streakDays } = stats;
  const weekly = stats.weekly || [];
  const levels = stats.levels || [];
  const maxCount = Math.max(...weekly.map((d) => d.count), 1);
  const hasActivity = weekly.some((d) => d.count > 0);

  let hero;
  if (totalWords === 0) {
    hero = {
      title: 'Add your first words',
      sub: 'Build your list, then review it at the right time.',
      cta: 'Add words',
      to: '/add',
    };
  } else if (dueToday > 0) {
    hero = {
      title: `${dueToday} word${dueToday > 1 ? 's' : ''} due today`,
      sub: `About ${Math.max(1, Math.round(dueToday * 0.5))} min. Regular reviews keep words in long-term memory.`,
      cta: 'Start review',
      to: '/review',
    };
  } else {
    hero = {
      title: "You're all caught up",
      sub: 'Your next reviews will show up here when they are due.',
      cta: 'Add words',
      to: '/add',
    };
  }

  const metrics = [
    { icon: BookOpen, value: totalWords, label: 'Total words' },
    { icon: Repeat, value: totalReviews, label: 'Reviews done' },
    { icon: Clock, value: dueToday, label: 'Due today', highlight: dueToday > 0 },
    { icon: Flame, value: streakDays, label: 'Day streak' },
  ];

  return (
    <div className="page">
      <div className={styles.greet}>
        <h2>{greeting()}</h2>
        <p>
          {streakDays > 0
            ? `You're on a ${streakDays}-day streak. Keep it going.`
            : 'Review a few words today to start your streak.'}
        </p>
      </div>

      <div className={styles.hero}>
        <div>
          <div className={styles.heroTitle}>{hero.title}</div>
          <div className={styles.heroSub}>{hero.sub}</div>
        </div>
        <button className="btn-cta" onClick={() => navigate(hero.to)}>
          {hero.cta} <ArrowRight size={16} style={{ verticalAlign: '-3px' }} />
        </button>
      </div>

      <div className={styles.metrics}>
        {metrics.map(({ icon: Icon, value, label, highlight }) => (
          <div
            key={label}
            className={`${styles.metric} ${highlight ? styles.metricHighlight : ''}`}
          >
            <Icon size={18} className={styles.metricIcon} />
            <div className={styles.metricValue}>{value}</div>
            <div className={styles.metricLabel}>{label}</div>
          </div>
        ))}
      </div>

      <div className={styles.grid}>
  <div className="card">
    <h3 className={styles.cardTitle}>Last 7 days</h3>
    <div className={styles.bars}>
      {weekly.map((day, i) => {
        const height = day.count === 0 ? 6 : Math.round((day.count / maxCount) * 80) + 10;
        const label = DAYS[new Date(`${day.date}T00:00:00`).getDay()];
        const isToday = i === weekly.length - 1;
        return (
          <div
            key={day.date}
            className={styles.bar}
            title={`${day.count} review${day.count === 1 ? '' : 's'}`}
          >
            <span
              className={`${styles.barFill} ${day.count === 0 ? styles.barEmpty : ''} ${isToday ? styles.barToday : ''}`}
              style={{ height }}
            />
            <span className={styles.barLabel}>{label}</span>
          </div>
        );
      })}
    </div>
    {!hasActivity && (
      <p className={styles.hint}>Complete a review to see your daily activity here.</p>
    )}
  </div>

  <div className="card">
    <h3 className={styles.cardTitle}>Progress by level</h3>
    {levels.length === 0 ? (
      <p className={styles.muted}>Add words with a level to see your progress.</p>
    ) : (
      <>
        {levels.map((lv) => {
          const masteredPct = Math.round((lv.mastered / lv.total) * 100);
          const learningPct = Math.round(((lv.learning || 0) / lv.total) * 100);
          return (
            <div key={lv.level} className={styles.level}>
              <span className={styles.levelName}>{lv.level}</span>
              <div className={styles.track}>
                <div className={styles.trackMastered} style={{ width: `${masteredPct}%` }} />
                <div className={styles.trackLearning} style={{ width: `${learningPct}%` }} />
              </div>
              <span className={styles.levelCount}>{lv.mastered}/{lv.total}</span>
            </div>
          );
        })}
        <div className={styles.legend}>
          <span><span className={styles.dotMastered} /> Mastered</span>
          <span><span className={styles.dotLearning} /> Learning</span>
        </div>
        <p className={styles.footnote}>Mastered means a review interval of 21 days or more.</p>
      </>
    )}
  </div>
</div>
    </div>
  );
}