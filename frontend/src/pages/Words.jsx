import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import api from '../api/axios';
import GermanWord from '../components/GermanWord';
import styles from './Words.module.css';

function formatDue(dateStr) {
  if (!dateStr) return { label: 'Due now', now: true };
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff <= 0) return { label: 'Due now', now: true };
  if (diff === 1) return { label: 'Tomorrow', now: false };
  return { label: `In ${diff} days`, now: false };
}

export default function Words() {
  const [words, setWords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('All');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ german: '', english: '', category_id: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/words'), api.get('/words/categories')])
      .then(([wordsRes, catsRes]) => {
        setWords(wordsRes.data);
        setCategories(catsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return words.filter((w) => {
      const matchesLevel = level === 'All' || w.category_name === level;
      const matchesSearch =
        w.german.toLowerCase().includes(q) || w.english.toLowerCase().includes(q);
      return matchesLevel && matchesSearch;
    });
  }, [words, search, level]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this word?')) return;
    await api.delete(`/words/${id}`);
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const handleEditStart = (word) => {
    setEditingId(word.id);
    setEditForm({
      german: word.german,
      english: word.english,
      category_id: word.category_id || '',
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
        category_id: editForm.category_id || null,
      });
      const cat = categories.find((c) => String(c.id) === String(res.data.category_id));
      setWords((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, ...res.data, category_name: cat ? cat.name : null } : w
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading words…</div>;

  const levels = ['All', ...categories.map((c) => c.name)];

  return (
    <div className="page">
      <div className={styles.header}>
        <div>
          <h2>My words</h2>
          <p>{words.length} word{words.length !== 1 ? 's' : ''} in your collection</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/add')}>
          <Plus size={16} style={{ verticalAlign: '-3px' }} /> Add word
        </button>
      </div>

      <div className={styles.searchWrap}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search German or English"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.filters}>
        {levels.map((l) => (
          <button
            key={l}
            className={`${styles.filter} ${level === l ? styles.filterActive : ''}`}
            onClick={() => setLevel(l)}
          >
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          {words.length === 0 ? (
            <>
              <p>Your word list is empty.</p>
              <button className="btn-primary" onClick={() => navigate('/add')}>Add your first word</button>
            </>
          ) : (
            <p>No words match your search.</p>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((word) => {
            const due = formatDue(word.next_review_at);
            const isEditing = editingId === word.id;

            return (
              <div
                key={word.id}
                className={`card ${styles.wordRow} ${isEditing ? styles.editing : ''}`}
              >
                {isEditing ? (
                  <div className={styles.editForm}>
                    <div className={styles.editFields}>
                      <input
                        type="text"
                        value={editForm.german}
                        onChange={(e) => setEditForm((p) => ({ ...p, german: e.target.value }))}
                        placeholder="German word"
                      />
                      <input
                        type="text"
                        value={editForm.english}
                        onChange={(e) => setEditForm((p) => ({ ...p, english: e.target.value }))}
                        placeholder="English translation"
                      />
                      <select
                        value={editForm.category_id}
                        onChange={(e) => setEditForm((p) => ({ ...p, category_id: e.target.value }))}
                      >
                        <option value="">No level</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.editActions}>
                      <button className="btn-primary" onClick={() => handleEditSave(word.id)} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button className="btn-secondary" onClick={handleEditCancel}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.wordMain}>
                      <span className={styles.german}><GermanWord text={word.german} /></span>
                      <span className={styles.english}>{word.english}</span>
                    </div>
                    <div className={styles.meta}>
                      {word.category_name && <span className="chip">{word.category_name}</span>}
                      <span className={`${styles.due} ${due.now ? styles.dueNow : ''}`}>{due.label}</span>
                      <button
                        className={styles.iconBtn}
                        onClick={() => handleEditStart(word)}
                        aria-label={`Edit ${word.german}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => handleDelete(word.id)}
                        aria-label={`Delete ${word.german}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}