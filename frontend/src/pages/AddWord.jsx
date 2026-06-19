import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import styles from './AddWord.module.css';

export default function AddWord() {
  const [german, setGerman] = useState('');
  const [english, setEnglish] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/words/categories').then(res => setCategories(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/words', { german, english, category_id: categoryId || null });
      setSuccess(`"${german}" added successfully!`);
      setGerman('');
      setEnglish('');
      setCategoryId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add word.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className={styles.header}>
        <h2>Add a Word</h2>
        <p>Add German vocabulary to your personal learning list.</p>
      </div>

      <div className={`card ${styles.formCard}`}>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className={styles.successMsg}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>German word</label>
              <input
                type="text"
                placeholder="e.g. der Hund"
                value={german}
                onChange={e => setGerman(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label>English translation</label>
              <input
                type="text"
                placeholder="e.g. the dog"
                value={english}
                onChange={e => setEnglish(e.target.value)}
                required
              />
            </div>
          </div>
<div className={styles.field}>
  <label>CEFR Level (optional)</label>
  <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
    <option value="">Select level...</option>
    
    {categories
      .reduce((unique, current) => {
        if (!unique.some(item => item.id === current.id || item.name === current.name)) {
          unique.push(current);
        }
        return unique;
      }, [])
      .map(c => {
        // This Regex deletes anything that isn't a standard letter, number, space, or normal punctuation
        const sanitizeText = (str) => {
          if (!str) return '';
          return str
            .replace(/[^\x00-\x7F]/g, '') // Strips out raw broken UTF-8/ISO bytes completely
            .replace(/\s+/g, ' ')         // Cleans up any messy double spacing left over
            .trim();
        };

        const cleanName = sanitizeText(c.name);
        const cleanDescription = sanitizeText(c.description);

        return (
          <option key={c.id} value={c.id}>
            {cleanName} - {cleanDescription}
          </option>
        );
      })
    }
  </select>
</div>

          <div className={styles.actions}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add word'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/words')}>
              View all words
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}