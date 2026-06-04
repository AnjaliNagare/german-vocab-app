import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/review/stats').then(res => {
      setStats(res.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const chartData = [
    { name: 'Total Words', value: stats.totalWords },
    { name: 'Reviews Done', value: stats.totalReviews },
    { name: 'Due Today', value: stats.dueToday },
    { name: 'Day Streak', value: stats.streakDays },
  ];

  return (
    <div className="page">
      <div className={styles.header}>
        <h2>Your Progress</h2>
        <p>Keep up the streak — consistency is everything with language learning.</p>
      </div>

      <div className={styles.metrics}>
        <div className={`card ${styles.metric}`}>
          <span className={styles.metricNum}>{stats.totalWords}</span>
          <span className={styles.metricLabel}>Total words</span>
        </div>
        <div className={`card ${styles.metric}`}>
          <span className={styles.metricNum}>{stats.totalReviews}</span>
          <span className={styles.metricLabel}>Reviews done</span>
        </div>
        <div className={`card ${styles.metric} ${stats.dueToday > 0 ? styles.due : ''}`}>
          <span className={styles.metricNum}>{stats.dueToday}</span>
          <span className={styles.metricLabel}>Due today</span>
        </div>
        <div className={`card ${styles.metric}`}>
          <span className={styles.metricNum}>{stats.streakDays} 🔥</span>
          <span className={styles.metricLabel}>Day streak</span>
        </div>
      </div>

      {stats.dueToday > 0 && (
        <div className={`card ${styles.reviewPrompt}`}>
          <div>
            <strong>You have {stats.dueToday} word{stats.dueToday > 1 ? 's' : ''} to review</strong>
            <p>Regular reviews keep words in long-term memory.</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/review')}>
            Start Review →
          </button>
        </div>
      )}

      {stats.totalWords === 0 && (
        <div className={`card ${styles.emptyState}`}>
          <p>No words yet — add some to get started!</p>
          <button className="btn-primary" onClick={() => navigate('/add')}>
            Add your first word
          </button>
        </div>
      )}

      <div className={`card ${styles.chartCard}`}>
        <h3>Overview</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#378ADD" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}