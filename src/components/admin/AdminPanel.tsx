import { useEffect, useState } from 'react'
import type { Question, GameConfig, Lead } from '../../types'
import {
  subscribeToConfig,
  initializeGame,
  getQuestions,
  saveQuestion,
  deleteQuestion,
  updateConfig,
  getLeads,
  clearLeads,
  initializeQuestionsFromJson,
} from '../../firebase/gameService'
import questionsData from '../../data/questions.json'
import type { Question as QuestionType } from '../../types'

type Tab = 'questions' | 'config' | 'leads'
type Difficulty = 'easy' | 'medium' | 'hard'

const CATEGORIES = [
  'Equity Compensation Basics',
  'Tax & Compliance',
  'Administration & Operations',
  'Global Equity',
  'Fun / Industry Culture',
]

const EMPTY_QUESTION: Omit<Question, 'id'> = {
  question: '',
  choices: ['', '', '', ''],
  correctIndex: 0,
  category: CATEGORIES[0],
  difficulty: 'easy',
  explanation: '',
  active: true,
}

function generateId(): string {
  return 'q' + Date.now().toString().slice(-8)
}

const DEFAULT_PASSWORD = 'aep2026'

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>('questions')
  const [questions, setQuestions] = useState<Record<string, Question>>({})
  const [leads, setLeads] = useState<Record<string, Lead>>({})
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Omit<Question, 'id'>>(EMPTY_QUESTION)
  const [configForm, setConfigForm] = useState<Partial<GameConfig>>({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Subscriptions
  useEffect(() => {
    const unsub = subscribeToConfig((cfg) => {
      setConfig(cfg)
      setConfigLoaded(true)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!authed) return
    // If database was empty, initialize game config and game state
    if (!config) {
      initializeGame()
    }
    initializeQuestionsFromJson(questionsData as QuestionType[]).then(() => {
      getQuestions().then(setQuestions)
    })
    getLeads().then(setLeads)
  }, [authed])

  useEffect(() => {
    if (config) {
      setConfigForm({ ...config })
    }
  }, [config])

  const handleLogin = () => {
    if (!configLoaded) {
      setPasswordError('Connecting to Firebase... try again in a moment.')
      return
    }
    // config is null when database is empty (first run) — fall back to default password
    const expectedPassword = config?.adminPassword ?? DEFAULT_PASSWORD
    if (passwordInput === expectedPassword) {
      setAuthed(true)
      setPasswordError('')
    } else {
      setPasswordError('Incorrect password.')
    }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    await updateConfig(configForm)
    setSaveMessage('Config saved!')
    setSaving(false)
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const handleSaveQuestion = async () => {
    if (!formData.question.trim()) return
    const id = editingQuestion?.id ?? generateId()
    const q: Question = { id, ...formData }
    await saveQuestion(q)
    const updated = await getQuestions()
    setQuestions(updated)
    setShowForm(false)
    setEditingQuestion(null)
    setFormData(EMPTY_QUESTION)
  }

  const handleEditQuestion = (q: Question) => {
    setEditingQuestion(q)
    setFormData({
      question: q.question,
      choices: [...q.choices],
      correctIndex: q.correctIndex,
      category: q.category,
      difficulty: q.difficulty,
      explanation: q.explanation,
      active: q.active,
    })
    setShowForm(true)
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Delete this question?')) return
    await deleteQuestion(id)
    const updated = await getQuestions()
    setQuestions(updated)
  }

  const handleToggleActive = async (q: Question) => {
    await saveQuestion({ ...q, active: !q.active })
    const updated = await getQuestions()
    setQuestions(updated)
  }

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const arr = JSON.parse(ev.target?.result as string) as Question[]
        for (const q of arr) {
          await saveQuestion(q)
        }
        const updated = await getQuestions()
        setQuestions(updated)
        alert(`Imported ${arr.length} questions.`)
      } catch {
        alert('Invalid JSON file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string
        const lines = text.split('\n').filter((l) => l.trim())
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
        const arr: Question[] = lines.slice(1).map((line, i) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
          const get = (key: string) => cols[headers.indexOf(key)] ?? ''
          return {
            id: get('id') || generateId(),
            question: get('question'),
            choices: [get('choiceA'), get('choiceB'), get('choiceC'), get('choiceD')],
            correctIndex: parseInt(get('correctIndex') || '0'),
            category: get('category') || CATEGORIES[0],
            difficulty: (get('difficulty') || 'easy') as Difficulty,
            explanation: get('explanation'),
            active: get('active') !== 'false',
          }
        })
        for (const q of arr) {
          await saveQuestion(q)
        }
        const updated = await getQuestions()
        setQuestions(updated)
        alert(`Imported ${arr.length} questions from CSV.`)
      } catch {
        alert('Error parsing CSV file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExportJSON = () => {
    const arr = Object.values(questions)
    const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'questions.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportLeadsCSV = () => {
    const arr = Object.values(leads)
    if (arr.length === 0) return alert('No leads to export.')
    const headers = ['nickname', 'firstName', 'email', 'company', 'optIn', 'timestamp']
    const rows = arr.map((l) =>
      [l.nickname, l.firstName, l.email, l.company, l.optIn, new Date(l.timestamp).toISOString()].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearLeads = async () => {
    if (!window.confirm('Clear all leads? This cannot be undone.')) return
    await clearLeads()
    setLeads({})
  }

  const filteredQuestions = Object.values(questions).filter((q) => {
    if (filterCategory !== 'all' && q.category !== filterCategory) return false
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
    return true
  })

  // ─── Password gate ─────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: '#0f1420' }}
      >
        <div
          className="w-full max-w-sm p-8 rounded-2xl flex flex-col gap-5"
          style={{ backgroundColor: '#1a1f2e' }}
        >
          <div className="text-center">
            <div className="text-white font-bold uppercase tracking-widest text-sm mb-1">
              Accelerated Equity Plans
            </div>
            <div className="text-2xl font-black" style={{ color: '#AC2228' }}>
              Admin Panel
            </div>
          </div>
          <input
            type="password"
            className="w-full px-4 py-3 rounded-xl text-white outline-none"
            style={{ backgroundColor: '#2d3748' }}
            placeholder="Admin password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {passwordError && (
            <div className="text-red-400 text-sm text-center">{passwordError}</div>
          )}
          <button
            onClick={handleLogin}
            disabled={!configLoaded}
            className="w-full py-3 rounded-xl text-white font-bold uppercase tracking-wide transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#AC2228' }}
          >
            {configLoaded ? 'Login' : 'Connecting...'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Admin UI ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f1420' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: '#1a1f2e' }}
      >
        <div>
          <span className="text-white font-bold uppercase tracking-widest text-sm">AEP &nbsp;</span>
          <span className="font-black" style={{ color: '#AC2228' }}>Admin</span>
        </div>
        <button
          onClick={() => setAuthed(false)}
          className="text-gray-400 text-sm hover:text-white transition"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-6" style={{ backgroundColor: '#1a1f2e' }}>
        {(['questions', 'config', 'leads'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 font-semibold text-sm uppercase tracking-wide transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'text-white border-red-600'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 overflow-auto">

        {/* ── QUESTIONS TAB ── */}
        {tab === 'questions' && (
          <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={() => {
                  setEditingQuestion(null)
                  setFormData(EMPTY_QUESTION)
                  setShowForm(true)
                }}
                className="px-5 py-2 rounded-lg text-white font-bold text-sm uppercase tracking-wide transition-all hover:opacity-90"
                style={{ backgroundColor: '#AC2228' }}
              >
                + Add Question
              </button>

              <label className="px-5 py-2 rounded-lg text-white font-bold text-sm uppercase tracking-wide cursor-pointer transition-all hover:opacity-80"
                style={{ backgroundColor: '#2d3748' }}>
                Import JSON
                <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              </label>

              <label className="px-5 py-2 rounded-lg text-white font-bold text-sm uppercase tracking-wide cursor-pointer transition-all hover:opacity-80"
                style={{ backgroundColor: '#2d3748' }}>
                Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              </label>

              <button
                onClick={handleExportJSON}
                className="px-5 py-2 rounded-lg text-white font-bold text-sm uppercase tracking-wide transition-all hover:opacity-80"
                style={{ backgroundColor: '#2d3748' }}
              >
                Export JSON
              </button>

              <select
                className="px-3 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: '#2d3748' }}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="px-3 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: '#2d3748' }}
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <span className="text-gray-400 text-sm ml-auto">
                {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Question form */}
            {showForm && (
              <div
                className="p-5 rounded-xl flex flex-col gap-4"
                style={{ backgroundColor: '#1a1f2e' }}
              >
                <div className="text-white font-bold text-lg">
                  {editingQuestion ? 'Edit Question' : 'Add Question'}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 text-xs uppercase tracking-wide">Question</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg text-white text-sm resize-none outline-none"
                    style={{ backgroundColor: '#2d3748' }}
                    rows={3}
                    value={formData.question}
                    onChange={(e) => setFormData((p) => ({ ...p, question: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {['A', 'B', 'C', 'D'].map((label, idx) => (
                    <div key={label} className="flex flex-col gap-1">
                      <label className="text-gray-400 text-xs uppercase tracking-wide">Choice {label}</label>
                      <input
                        className="px-3 py-2 rounded-lg text-white text-sm outline-none"
                        style={{ backgroundColor: '#2d3748' }}
                        value={formData.choices[idx]}
                        onChange={(e) => {
                          const choices = [...formData.choices]
                          choices[idx] = e.target.value
                          setFormData((p) => ({ ...p, choices }))
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 text-xs uppercase tracking-wide">Correct Answer</label>
                    <div className="flex gap-2">
                      {['A', 'B', 'C', 'D'].map((label, idx) => (
                        <button
                          key={label}
                          onClick={() => setFormData((p) => ({ ...p, correctIndex: idx }))}
                          className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                            formData.correctIndex === idx
                              ? 'bg-green-600 text-white'
                              : 'text-gray-300'
                          }`}
                          style={formData.correctIndex !== idx ? { backgroundColor: '#2d3748' } : {}}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 text-xs uppercase tracking-wide">Category</label>
                    <select
                      className="px-3 py-2 rounded-lg text-white text-sm"
                      style={{ backgroundColor: '#2d3748' }}
                      value={formData.category}
                      onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 text-xs uppercase tracking-wide">Difficulty</label>
                    <select
                      className="px-3 py-2 rounded-lg text-white text-sm"
                      style={{ backgroundColor: '#2d3748' }}
                      value={formData.difficulty}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, difficulty: e.target.value as Difficulty }))
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 justify-end">
                    <label className="text-gray-400 text-xs uppercase tracking-wide">Active</label>
                    <button
                      onClick={() => setFormData((p) => ({ ...p, active: !p.active }))}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        formData.active ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {formData.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 text-xs uppercase tracking-wide">Explanation</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg text-white text-sm resize-none outline-none"
                    style={{ backgroundColor: '#2d3748' }}
                    rows={2}
                    value={formData.explanation}
                    onChange={(e) => setFormData((p) => ({ ...p, explanation: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveQuestion}
                    className="px-6 py-2 rounded-lg text-white font-bold text-sm uppercase tracking-wide transition-all hover:opacity-90"
                    style={{ backgroundColor: '#AC2228' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setEditingQuestion(null)
                      setFormData(EMPTY_QUESTION)
                    }}
                    className="px-6 py-2 rounded-lg text-white font-bold text-sm uppercase tracking-wide bg-gray-700 hover:bg-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Questions table */}
            <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: '#1a1f2e' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 uppercase text-xs tracking-wide border-b border-gray-700">
                    <th className="px-4 py-3 text-left">Question</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Difficulty</th>
                    <th className="px-4 py-3 text-center">Active</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((q) => (
                    <tr
                      key={q.id}
                      className="border-b border-gray-800 hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-4 py-3 text-white max-w-xs truncate">{q.question}</td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{q.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            q.difficulty === 'easy'
                              ? 'bg-green-900 text-green-300'
                              : q.difficulty === 'medium'
                              ? 'bg-yellow-900 text-yellow-300'
                              : 'bg-red-900 text-red-300'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(q)}
                          className={`w-12 py-0.5 rounded text-xs font-bold transition-all ${
                            q.active ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {q.active ? 'ON' : 'OFF'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEditQuestion(q)}
                            className="px-3 py-1 rounded text-xs font-bold text-white bg-blue-800 hover:bg-blue-700 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="px-3 py-1 rounded text-xs font-bold text-white bg-red-900 hover:bg-red-800 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredQuestions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No questions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CONFIG TAB ── */}
        {tab === 'config' && configForm && (
          <div className="max-w-lg flex flex-col gap-5">
            <div className="text-white font-bold text-xl">Game Configuration</div>

            <div
              className="p-5 rounded-xl flex flex-col gap-4"
              style={{ backgroundColor: '#1a1f2e' }}
            >
              <ConfigField label="Room Code">
                <input
                  className="flex-1 px-3 py-2 rounded-lg text-white text-sm outline-none font-mono"
                  style={{ backgroundColor: '#2d3748' }}
                  value={configForm.roomCode ?? ''}
                  onChange={(e) => setConfigForm((p) => ({ ...p, roomCode: e.target.value.toUpperCase().slice(0, 4) }))}
                  maxLength={4}
                />
              </ConfigField>

              <ConfigField label="Play URL">
                <input
                  className="flex-1 px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ backgroundColor: '#2d3748' }}
                  value={configForm.playUrl ?? ''}
                  onChange={(e) => setConfigForm((p) => ({ ...p, playUrl: e.target.value }))}
                  placeholder="https://your-app.azurestaticapps.net/play"
                />
              </ConfigField>

              <ConfigField label="Questions per Game">
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-24 px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ backgroundColor: '#2d3748' }}
                  value={configForm.questionsPerGame ?? 10}
                  onChange={(e) =>
                    setConfigForm((p) => ({ ...p, questionsPerGame: parseInt(e.target.value) || 10 }))
                  }
                />
              </ConfigField>

              <ConfigField label="Timer (seconds)">
                <input
                  type="number"
                  min={5}
                  max={60}
                  className="w-24 px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ backgroundColor: '#2d3748' }}
                  value={configForm.timeLimit ?? 20}
                  onChange={(e) =>
                    setConfigForm((p) => ({ ...p, timeLimit: parseInt(e.target.value) || 20 }))
                  }
                />
              </ConfigField>

              <ConfigField label="Randomize Order">
                <button
                  onClick={() => setConfigForm((p) => ({ ...p, randomizeOrder: !p.randomizeOrder }))}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    configForm.randomizeOrder ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {configForm.randomizeOrder ? 'On' : 'Off'}
                </button>
              </ConfigField>

              <ConfigField label="Admin Password">
                <input
                  className="flex-1 px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ backgroundColor: '#2d3748' }}
                  value={configForm.adminPassword ?? ''}
                  onChange={(e) => setConfigForm((p) => ({ ...p, adminPassword: e.target.value }))}
                />
              </ConfigField>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-8 py-3 rounded-lg text-white font-bold uppercase tracking-wide transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#AC2228' }}
              >
                {saving ? 'Saving...' : 'Save Config'}
              </button>
              {saveMessage && (
                <span className="text-green-400 text-sm">{saveMessage}</span>
              )}
            </div>
          </div>
        )}

        {/* ── LEADS TAB ── */}
        {tab === 'leads' && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-center">
              <div className="text-white font-bold text-xl flex-1">
                Leads ({Object.keys(leads).length})
              </div>
              <button
                onClick={handleExportLeadsCSV}
                className="px-5 py-2 rounded-lg text-white font-bold text-sm uppercase tracking-wide transition-all hover:opacity-80"
                style={{ backgroundColor: '#2d3748' }}
              >
                Export CSV
              </button>
              <button
                onClick={handleClearLeads}
                className="px-5 py-2 rounded-lg text-white font-bold text-sm uppercase tracking-wide bg-red-900 hover:bg-red-800 transition-all"
              >
                Clear Leads
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: '#1a1f2e' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 uppercase text-xs tracking-wide border-b border-gray-700">
                    <th className="px-4 py-3 text-left">Nickname</th>
                    <th className="px-4 py-3 text-left">First Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-center">Opt-In</th>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(leads).map((lead) => (
                    <tr
                      key={lead.playerId}
                      className="border-b border-gray-800 hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-4 py-3 text-white">{lead.nickname}</td>
                      <td className="px-4 py-3 text-gray-300">{lead.firstName}</td>
                      <td className="px-4 py-3 text-gray-300">{lead.email}</td>
                      <td className="px-4 py-3 text-gray-300">{lead.company}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            lead.optIn ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {lead.optIn ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(lead.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(leads).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No leads yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConfigField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-gray-400 text-sm w-44 flex-shrink-0">{label}</label>
      {children}
    </div>
  )
}
