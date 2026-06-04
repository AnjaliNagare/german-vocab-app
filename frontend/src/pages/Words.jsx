import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import styles from './Words.module.css';

export default function Words() {
  const [words, setWords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ german: '', english: '', category_id: '' });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/words'),
      api.get('/words/categories')
    ]).then(([wordsRes, catsRes]) => {
      setWords(wordsRes.data);
      setFiltered(wordsRes.data);
      setCategories(catsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(words.filter(w =>
      w.german.toLowerCase().includes(q) || w.english.toLowerCase().includes(q)
    ));
  }, [search, words]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this word?')) return;
    await api.delete(`/words/${id}`);
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const handleEditStart = (word) => {
    setEditingId(word.id);
    setEditForm({
      german: word.german,
      english: word.english,
      category_id: word.category_id || ''
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ german: '', english: '', category_id: '' });
  };

  const handleEditSave = async (id) => {
    if (!editForm.german || !editForm.english) return;
    setSaving(true);
    try {
      const res = await api.put(`/words/${id}`, {
        german: editForm.german,
        english: editForm.english,
        category_id: editForm.category_id || null
      });
      setWords(prev => prev.map(w => w.id === id ? { ...w, ...res.data } : w));
      setEditingId(null);
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Due now';
    const date = new Date(dateStr);
    const diff = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Due now';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  if (loading) return <div className="loading">Loading words...</div>;

  return (
    <div className="page">
      <div className={styles.header}>
        <div>
          <h2>My Words</h2>
          <p>{words.length} word{words.length !== 1 ? 's' : ''} in your collection</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/add')}>+ Add Word</button>
      </div>

      <input
        type="text"
        placeholder="Search German or English..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {filtered.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          {words.length === 0
            ? <p>No words yet. <button className="btn-primary" onClick={() => navigate('/add')}>Add your first word</button></p>
            : <p>No words match your search.</p>
          }
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(word => (
            <div key={word.id} className={`card ${styles.wordRow} ${editingId === word.id ? styles.editing : ''}`}>

              {editingId === word.id ? (
                // ── Edit mode ──────────────────────────────
                <div className={styles.editForm}>
                  <div className={styles.editFields}>
                    <input
                      type="text"
                      value={editForm.german}
                      onChange={e => setEditForm(p => ({ ...p, german: e.target.value }))}
                      placeholder="German word"
                    />
                    <input
                      type="text"
                      value={editForm.english}
                      onChange={e => setEditForm(p => ({ ...p, english: e.target.value }))}
                      placeholder="English translation"
                    />
                    <select
                      value={editForm.category_id}
                      onChange={e => setEditForm(p => ({ ...p, category_id: e.target.value }))}
                    >
                      <option value="">No level</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.editActions}>
                    <button
                      className="btn-primary"
                      onClick={() => handleEditSave(word.id)}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="btn-secondary" onClick={handleEditCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // ── View mode ──────────────────────────────
                <>
                  <div className={styles.wordMain}>
                    <span className={styles.german}>{word.german}</span>
                    <span className={styles.arrow}>→</span>
                    <span className={styles.english}>{word.english}</span>
                  </div>
                  <div className={styles.wordMeta}>
                    {word.category_name && (
                      <span className={styles.badge}>{word.category_name}</span>
                    )}
                    <span className={styles.due}>{formatDate(word.next_review_at)}</span>
                    <button
                      className="btn-secondary"
                      onClick={() => handleEditStart(word)}
                    >
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => handleDelete(word.id)}>
                      Delete
                    </button>
                  </div>
                </>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}