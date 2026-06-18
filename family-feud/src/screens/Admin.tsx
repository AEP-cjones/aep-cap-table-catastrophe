import { useState, useEffect } from 'react'
import {
  useConfig, useRounds, saveRound, deleteRound, createRound, reorderRound,
  useLeads, markLeadSynced,
} from '../hooks/useFirebase'
import { sortedRoundKeys } from '../utils/rounds'
import { dbRef, remove, signInAsGameAdmin } from '../firebase'
import { downloadCsv } from '../utils/csv'
import { pushLeadToZoho } from '../services/zoho'
import AepHeader from '../components/AepHeader'
import Panel from '../components/Panel'
import type { Round, Answer, Lead } from '../types'

export default function Admin() {
  const rounds = useRounds()
  const leads = useLeads()
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [editingRound, setEditingRound] = useState<string | null>(null)
  const [tab, setTab] = useState<'rounds' | 'leads'>('rounds')

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col">
        <AepHeader />
        <div className="flex-1 flex items-center justify-center title-bg px-4">
          <div
            className="relative rounded-2xl p-8 w-[380px] max-w-full"
            style={{
              background:
                'linear-gradient(180deg, var(--navy-light) 0%, var(--navy-mid) 100%)',
              border: '2px solid var(--gold)',
              boxShadow:
                '0 0 0 6px rgba(255,215,0,0.08), 0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}Game_Show_Owl.webp`}
              alt=""
              className="owl-idle mx-auto block"
              style={{
                width: 96,
                height: 96,
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                marginTop: -64,
                marginBottom: 8,
              }}
            />
            <p className="text-center text-[10px] tracking-[0.3em] uppercase opacity-60 mb-1">
              Survey Says…
            </p>
            <h2
              className="font-bungee text-2xl text-center mb-6"
              style={{
                color: 'var(--gold)',
                textShadow: '0 0 20px rgba(255,215,0,0.35)',
              }}
            >
              Admin Access
            </h2>
            <label className="text-[10px] tracking-[0.22em] uppercase opacity-60 mb-1 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loggingIn) tryLogin()
              }}
              placeholder="••••••••"
              autoFocus
              disabled={loggingIn}
              className="w-full bg-[var(--navy)] rounded-lg px-4 py-3 text-white text-center tracking-[0.3em] border-2 border-transparent focus:border-[var(--gold)] outline-none mb-4 transition-all disabled:opacity-60"
              style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)' }}
            />
            <button
              onClick={tryLogin}
              disabled={loggingIn}
              className="w-full py-3 rounded-lg font-bungee text-lg tracking-widest transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background:
                  'linear-gradient(180deg, var(--gold) 0%, var(--gold-dark) 100%)',
                color: 'var(--navy)',
                boxShadow:
                  '0 4px 14px rgba(255,215,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
              }}
            >
              {loggingIn ? 'Verifying…' : 'Enter'}
            </button>
            {loginError && (
              <p className="text-center text-sm mt-3" style={{ color: '#ff6b6b' }}>
                {loginError}
              </p>
            )}
            <p className="text-center text-[10px] opacity-40 mt-4 tracking-widest uppercase">
              Equity Family Feud
            </p>
          </div>
        </div>
      </div>
    )
  }

  async function tryLogin() {
    if (loggingIn) return
    setLoginError(null)
    setLoggingIn(true)
    try {
      // Server-validated password — exchanges for a Firebase custom token
      // with `gameAdmin: true` claim. After this resolves, the rules let
      // us read leads + write rounds/config.
      await signInAsGameAdmin(password)
      setAuthed(true)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoggingIn(false)
    }
  }

  const roundKeys = sortedRoundKeys(rounds)
  const leadCount = leads ? Object.keys(leads).length : 0

  async function handleAddRound() {
    const id = await createRound({
      question: 'New Question',
      answers: [
        { text: 'Answer 1', points: 40, revealed: false },
        { text: 'Answer 2', points: 30, revealed: false },
        { text: 'Answer 3', points: 20, revealed: false },
        { text: 'Answer 4', points: 10, revealed: false },
        { text: 'Answer 5', points: 5, revealed: false },
      ],
    })
    setEditingRound(id)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AepHeader />
      <AdminToolbar
        tab={tab}
        onTabChange={setTab}
        roundCount={roundKeys.length}
        leadCount={leadCount}
        onAddRound={handleAddRound}
      />
      <div className="p-4 max-w-3xl mx-auto w-full space-y-4">
        {tab === 'rounds' ? (
          <>
            {roundKeys.map((key, idx) => (
              <RoundEditor
                key={key}
                roundId={key}
                round={rounds![key]}
                position={idx + 1}
                canMoveUp={idx > 0}
                canMoveDown={idx < roundKeys.length - 1}
                onMove={(dir) => reorderRound(key, dir, rounds!)}
                isExpanded={editingRound === key}
                onToggle={() => setEditingRound(editingRound === key ? null : key)}
                onDelete={async () => {
                  if (confirm(`Delete Round ${idx + 1}?`)) {
                    await deleteRound(key)
                    if (editingRound === key) setEditingRound(null)
                  }
                }}
              />
            ))}

            {roundKeys.length === 0 && (
              <p className="text-center opacity-50 py-8">
                No rounds yet. Use “+ Add Round” above to create one.
              </p>
            )}
          </>
        ) : (
          <LeadsSection />
        )}
      </div>
    </div>
  )
}

function AdminToolbar({
  tab,
  onTabChange,
  roundCount,
  leadCount,
  onAddRound,
}: {
  tab: 'rounds' | 'leads'
  onTabChange: (t: 'rounds' | 'leads') => void
  roundCount: number
  leadCount: number
  onAddRound: () => void
}) {
  return (
    <div
      className="sticky top-0 z-30 w-full"
      style={{
        background: 'linear-gradient(180deg, var(--navy-light) 0%, var(--navy) 100%)',
        borderBottom: '2px solid var(--gold)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
      }}
    >
      <div
        className="max-w-3xl mx-auto flex items-center"
        style={{ padding: '12px 16px', gap: 12 }}
      >
        <h1
          className="font-bungee tracking-[0.16em] uppercase shrink-0"
          style={{ color: 'var(--gold)', fontSize: 16 }}
        >
          Admin
        </h1>
        <div className="flex-1 min-w-0">
          <TabBar
            tab={tab}
            onChange={onTabChange}
            roundCount={roundCount}
            leadCount={leadCount}
          />
        </div>
        {tab === 'rounds' && (
          <button
            onClick={onAddRound}
            className="shrink-0 rounded-lg font-bungee tracking-widest transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              padding: '8px 16px',
              fontSize: 14,
              background: 'linear-gradient(180deg, var(--gold) 0%, var(--gold-dark) 100%)',
              color: 'var(--navy)',
              boxShadow:
                '0 4px 12px rgba(255,215,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            + Add Round
          </button>
        )}
      </div>
    </div>
  )
}

function TabBar({
  tab,
  onChange,
  roundCount,
  leadCount,
}: {
  tab: 'rounds' | 'leads'
  onChange: (t: 'rounds' | 'leads') => void
  roundCount: number
  leadCount: number
}) {
  return (
    <div
      className="flex rounded-xl overflow-hidden"
      style={{
        background: 'var(--navy-light)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <TabButton
        active={tab === 'rounds'}
        onClick={() => onChange('rounds')}
        label="Rounds"
        count={roundCount}
      />
      <TabButton
        active={tab === 'leads'}
        onClick={() => onChange('leads')}
        label="Leads"
        count={leadCount}
      />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center font-bungee tracking-[0.18em] uppercase transition-all relative"
      style={{
        padding: '10px 16px',
        gap: 8,
        fontSize: 13,
        background: active ? 'rgba(255,215,0,0.08)' : 'transparent',
        color: active ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
        borderBottom: active
          ? '3px solid var(--gold)'
          : '3px solid transparent',
      }}
    >
      <span>{label}</span>
      <span
        className="text-[11px] px-2 py-0.5 rounded-full tabular-nums"
        style={{
          background: active ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
          color: active ? 'var(--navy)' : 'rgba(255,255,255,0.6)',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: 0,
        }}
      >
        {count}
      </span>
    </button>
  )
}

function LeadsSection() {
  const leads = useLeads()
  const config = useConfig()
  const rows = leads
    ? Object.entries(leads)
        .map(([playerId, lead]) => ({ playerId, ...lead }))
        .sort((a, b) => parseTs(b.submittedAt) - parseTs(a.submittedAt))
    : []
  const count = rows.length
  const team1Name = config?.team1Name || 'Team 1'
  const team2Name = config?.team2Name || 'Team 2'

  // Sync-eligible: opted in AND not already synced
  const eligible = rows.filter((r) => r.optIn === true && !r.zohoLeadId)
  const eligibleCount = eligible.length

  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const handleSyncToZoho = async () => {
    if (syncing || eligibleCount === 0) return
    setSyncing(true)
    let success = 0
    let failed = 0
    for (let i = 0; i < eligible.length; i++) {
      const r = eligible[i]
      setSyncStatus(`Syncing ${i + 1} of ${eligibleCount}…`)
      try {
        const lead: Lead = {
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          company: r.company,
          phone: r.phone,
          team: r.team,
          optIn: r.optIn,
          submittedAt: r.submittedAt,
        }
        const { zohoLeadId } = await pushLeadToZoho(lead, { team1Name, team2Name })
        await markLeadSynced(r.playerId, zohoLeadId)
        success++
      } catch (err) {
        console.error(`[sync] Failed for ${r.email}:`, err)
        failed++
      }
    }
    setSyncStatus(
      failed === 0
        ? `✓ Synced ${success} of ${eligibleCount}`
        : `✗ Synced ${success} of ${eligibleCount} — ${failed} failed (see console)`,
    )
    setSyncing(false)
    // Clear the status message after 6 seconds on success
    if (failed === 0) {
      setTimeout(() => setSyncStatus(null), 6000)
    }
  }

  return (
    <Panel
      title={`Leads (${count})`}
      action={
        <div className="flex gap-2 items-center flex-wrap">
          {syncStatus && (
            <span
              className="text-xs tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{
                background: syncStatus.startsWith('✗')
                  ? 'rgba(200,16,46,0.15)'
                  : syncStatus.startsWith('✓')
                    ? 'rgba(74,222,128,0.12)'
                    : 'rgba(255,215,0,0.1)',
                color: syncStatus.startsWith('✗')
                  ? 'var(--aep-red)'
                  : syncStatus.startsWith('✓')
                    ? '#4ade80'
                    : 'var(--gold)',
                border: `1px solid ${
                  syncStatus.startsWith('✗')
                    ? 'rgba(200,16,46,0.4)'
                    : syncStatus.startsWith('✓')
                      ? 'rgba(74,222,128,0.35)'
                      : 'rgba(255,215,0,0.3)'
                }`,
              }}
            >
              {syncStatus}
            </span>
          )}
          <button
            onClick={handleSyncToZoho}
            disabled={eligibleCount === 0 || syncing}
            title={
              eligibleCount === 0
                ? 'No opted-in, un-synced leads to push'
                : `Push ${eligibleCount} opted-in lead${eligibleCount === 1 ? '' : 's'} to Zoho CRM`
            }
            className="px-3 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 disabled:opacity-30 text-sm"
          >
            Sync to Zoho ({eligibleCount})
          </button>
          <button
            onClick={() => {
              downloadCsv(
                `equity-family-feud-leads-${new Date().toISOString().slice(0, 10)}.csv`,
                rows.map((r) => ({
                  firstName: r.firstName,
                  lastName: r.lastName,
                  email: r.email,
                  company: r.company || '',
                  phone: r.phone || '',
                  team: r.team ?? '',
                  optIn: r.optIn ? 'yes' : 'no',
                  zohoLeadId: r.zohoLeadId || '',
                  submittedAt: r.submittedAt,
                })),
              )
            }}
            disabled={count === 0}
            className="px-3 py-2 bg-[var(--gold)] text-[var(--navy)] rounded-lg font-bold hover:bg-[var(--gold-dark)] disabled:opacity-30 text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Clear all ${count} leads? This cannot be undone.`)) return
              await remove(dbRef('leads'))
            }}
            disabled={count === 0}
            className="px-3 py-2 bg-red-900 rounded-lg hover:bg-red-800 disabled:opacity-30 text-sm"
          >
            Clear
          </button>
        </div>
      }
      bodyClassName="space-y-3"
    >
      {count === 0 ? (
        <p className="text-sm opacity-50 text-center py-4">No leads collected yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm border-separate" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Company', 'Phone', 'Team', 'Opt-in', 'Synced', 'Submitted'].map((h) => (
                  <th
                    key={h}
                    className="text-left font-bungee tracking-[0.16em] uppercase"
                    style={{
                      padding: '10px 12px',
                      fontSize: 10,
                      color: 'var(--gold)',
                      background: 'rgba(255,215,0,0.06)',
                      borderBottom: '1px solid rgba(255,215,0,0.25)',
                      position: 'sticky',
                      top: 0,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)',
                  }}
                >
                  <td style={leadCell()} className="font-semibold">
                    {r.firstName} {r.lastName}
                  </td>
                  <td style={leadCell(0.85)}>
                    <a
                      href={`mailto:${r.email}`}
                      className="hover:underline"
                      style={{ color: 'var(--gold)' }}
                    >
                      {r.email}
                    </a>
                  </td>
                  <td style={leadCell(0.85)}>{r.company || '—'}</td>
                  <td style={leadCell(0.85)}>{r.phone || '—'}</td>
                  <td style={leadCell()}>
                    <TeamChip
                      team={r.team}
                      team1Name={team1Name}
                      team2Name={team2Name}
                    />
                  </td>
                  <td style={leadCell(0.85)}>
                    {r.optIn ? (
                      <span
                        className="inline-block text-[10px] tracking-widest uppercase rounded-full"
                        style={{
                          padding: '2px 8px',
                          color: '#4ade80',
                          background: 'rgba(74,222,128,0.12)',
                          border: '1px solid rgba(74,222,128,0.35)',
                        }}
                      >
                        Yes
                      </span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>
                  <td style={leadCell(0.85)}>
                    {r.zohoLeadId ? (
                      <span
                        className="inline-block text-[10px] tracking-widest uppercase rounded-full"
                        style={{
                          padding: '2px 8px',
                          color: '#4ade80',
                          background: 'rgba(74,222,128,0.12)',
                          border: '1px solid rgba(74,222,128,0.35)',
                        }}
                        title={r.zohoSyncedAt ? `Synced ${new Date(r.zohoSyncedAt).toLocaleString()} (Zoho ID ${r.zohoLeadId})` : ''}
                      >
                        ✓ Synced
                      </span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>
                  <td
                    style={{ ...leadCell(0.7), whiteSpace: 'nowrap' }}
                    title={
                      r.submittedAt ? new Date(r.submittedAt).toLocaleString() : ''
                    }
                  >
                    {relativeTime(r.submittedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

function leadCell(opacity = 1) {
  return {
    padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    opacity,
  } as const
}

function TeamChip({
  team,
  team1Name,
  team2Name,
}: {
  team?: 1 | 2 | null
  team1Name: string
  team2Name: string
}) {
  if (team !== 1 && team !== 2) {
    return <span className="opacity-40">—</span>
  }
  const accent = team === 1 ? '#60a5fa' : 'var(--aep-red)'
  const bg = team === 1 ? 'rgba(96,165,250,0.15)' : 'rgba(200,16,46,0.15)'
  return (
    <span
      className="inline-block font-bungee tracking-widest uppercase rounded-full"
      style={{
        padding: '2px 10px',
        fontSize: 10,
        color: accent,
        background: bg,
        border: `1px solid ${accent}`,
      }}
    >
      {team === 1 ? team1Name : team2Name}
    </span>
  )
}

function parseTs(ts?: string | null): number {
  if (!ts) return 0
  const t = Date.parse(ts)
  return Number.isFinite(t) ? t : 0
}

function relativeTime(ts?: string | null): string {
  const t = parseTs(ts)
  if (!t) return '—'
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`
  return new Date(t).toLocaleDateString()
}

function SaveStatus({
  state,
  dirty,
}: {
  state: 'idle' | 'saving' | 'saved'
  dirty: boolean
}) {
  if (state === 'saving' || dirty) {
    return (
      <span
        className="text-xs tracking-widest uppercase px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(255,215,0,0.08)',
          color: 'rgba(255,215,0,0.7)',
          border: '1px solid rgba(255,215,0,0.25)',
        }}
      >
        Saving…
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span
        className="text-xs tracking-widest uppercase px-3 py-1.5 rounded-full transition-opacity"
        style={{
          background: 'rgba(74,222,128,0.1)',
          color: '#4ade80',
          border: '1px solid rgba(74,222,128,0.35)',
        }}
      >
        ✓ Saved
      </span>
    )
  }
  return null
}

function RoundEditor({
  roundId,
  round,
  position,
  canMoveUp,
  canMoveDown,
  onMove,
  isExpanded,
  onToggle,
  onDelete,
}: {
  roundId: string
  round: Round
  position: number
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (dir: 'up' | 'down') => void
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const [question, setQuestion] = useState(round.question)
  const [answers, setAnswers] = useState<Answer[]>(round.answers)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    setQuestion(round.question)
    setAnswers(round.answers)
    setDirty(false)
    setSaveState('idle')
  }, [round])

  // Debounced autosave: 800ms after the last edit
  useEffect(() => {
    if (!dirty) return
    setSaveState('saving')
    const handle = setTimeout(async () => {
      await saveRound(roundId, {
        question,
        answers: answers.map((a) => ({ ...a, revealed: false })),
        ...(round.order !== undefined ? { order: round.order } : {}),
      })
      setDirty(false)
      setSaveState('saved')
      // fade the "Saved" badge after a beat
      setTimeout(() => setSaveState('idle'), 1500)
    }, 800)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, question, answers])

  function updateAnswer(index: number, field: keyof Answer, value: string | number) {
    const newAnswers = [...answers]
    newAnswers[index] = { ...newAnswers[index], [field]: value }
    setAnswers(newAnswers)
    setDirty(true)
  }

  function addAnswer() {
    if (answers.length >= 8) return
    setAnswers([...answers, { text: '', points: 0, revealed: false }])
    setDirty(true)
  }

  function removeAnswer(index: number) {
    if (answers.length <= 1) return
    setAnswers(answers.filter((_, i) => i !== index))
    setDirty(true)
  }

  function moveAnswer(index: number, dir: -1 | 1) {
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= answers.length) return
    const newAnswers = [...answers]
    ;[newAnswers[index], newAnswers[newIndex]] = [newAnswers[newIndex], newAnswers[index]]
    setAnswers(newAnswers)
    setDirty(true)
  }


  return (
    <div
      className="bg-[var(--navy-light)] rounded-xl overflow-hidden"
      style={{
        borderTop: '2px solid var(--gold)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.2)',
      }}
    >
      <div className="flex items-stretch">
        <div
          className="flex flex-col shrink-0"
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => onMove('up')}
            disabled={!canMoveUp}
            title="Move round up"
            aria-label="Move round up"
            className="flex-1 px-3 font-bungee leading-none transition-colors hover:bg-[var(--navy-mid)]/40"
            style={{ color: 'var(--gold)', fontSize: 12, opacity: canMoveUp ? 0.85 : 0.2, cursor: canMoveUp ? 'pointer' : 'not-allowed' }}
          >
            ▲
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={!canMoveDown}
            title="Move round down"
            aria-label="Move round down"
            className="flex-1 px-3 font-bungee leading-none transition-colors hover:bg-[var(--navy-mid)]/40"
            style={{ color: 'var(--gold)', fontSize: 12, opacity: canMoveDown ? 0.85 : 0.2, cursor: canMoveDown ? 'pointer' : 'not-allowed' }}
          >
            ▼
          </button>
        </div>
      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-3 p-4 hover:bg-[var(--navy-mid)]/30 transition-colors text-left"
      >
        <span
          className="font-bungee text-lg shrink-0"
          style={{ color: 'var(--gold)' }}
        >
          ROUND {position}
        </span>
        <span
          className="shrink-0 text-[10px] tracking-widest uppercase font-bungee px-2 py-0.5 rounded"
          style={{
            background: 'rgba(255,215,0,0.1)',
            color: 'var(--gold)',
            border: '1px solid rgba(255,215,0,0.3)',
          }}
        >
          {round.answers.length} {round.answers.length === 1 ? 'answer' : 'answers'}
        </span>
        <span
          className="shrink-0 text-[10px] tracking-widest uppercase opacity-70"
        >
          {round.answers.reduce((sum, a) => sum + (a.points || 0), 0)} pts
        </span>
        <span className="flex-1 text-sm opacity-80 truncate italic">
          {round.question || <em className="opacity-50 not-italic">(no question)</em>}
        </span>
        <span
          className="shrink-0 opacity-50 transition-transform"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▸
        </span>
      </button>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-[var(--navy-mid)]">
          <div>
            <label className="text-xs opacity-50">Question</label>
            <input
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value)
                setDirty(true)
              }}
              className="w-full bg-[var(--navy-mid)] rounded-lg px-3 py-2 text-white border border-transparent focus:border-[var(--gold)] outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs opacity-50">
              Answers ({answers.length}/8) — ranked by points
            </label>
            {answers.map((answer, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                style={{
                  background: 'rgba(0,0,0,0.18)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <span
                  className="font-bungee text-sm flex items-center justify-center shrink-0 rounded-full"
                  style={{
                    width: 26,
                    height: 26,
                    background: 'rgba(255,215,0,0.12)',
                    color: 'var(--gold)',
                    border: '1px solid rgba(255,215,0,0.3)',
                  }}
                >
                  {i + 1}
                </span>
                <input
                  value={answer.text}
                  onChange={(e) => updateAnswer(i, 'text', e.target.value)}
                  placeholder="Answer text"
                  className="flex-1 bg-[var(--navy-mid)] rounded-lg px-3 py-2 text-white text-sm border-2 border-transparent focus:border-[var(--gold)] outline-none transition-colors"
                  style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.25)' }}
                />
                <div className="relative shrink-0">
                  <input
                    type="number"
                    value={answer.points}
                    onChange={(e) =>
                      updateAnswer(i, 'points', parseInt(e.target.value) || 0)
                    }
                    className="w-20 rounded-full pl-3 pr-7 py-2 text-sm font-bungee tabular-nums text-center outline-none border-2 transition-colors"
                    style={{
                      background: 'rgba(255,215,0,0.08)',
                      borderColor: 'rgba(255,215,0,0.4)',
                      color: 'var(--gold)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)')
                    }
                    placeholder="0"
                  />
                  <span
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] tracking-widest pointer-events-none"
                    style={{ color: 'var(--gold)', opacity: 0.7 }}
                  >
                    PTS
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveAnswer(i, -1)}
                    className="text-xs leading-none px-1.5 hover:text-[var(--gold)] disabled:opacity-20"
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveAnswer(i, 1)}
                    className="text-xs leading-none px-1.5 hover:text-[var(--gold)] disabled:opacity-20"
                    disabled={i === answers.length - 1}
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>
                <button
                  onClick={() => removeAnswer(i)}
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
                  style={{
                    background: 'rgba(200,16,46,0.15)',
                    border: '1px solid rgba(200,16,46,0.4)',
                    color: 'var(--aep-red)',
                  }}
                  aria-label="Remove answer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {answers.length < 8 && (
              <button
                onClick={addAnswer}
                className="px-4 py-2 bg-[var(--navy-mid)] rounded-lg hover:bg-[var(--navy-mid)]/80 text-sm"
              >
                + Add Answer
              </button>
            )}
            <SaveStatus state={saveState} dirty={dirty} />
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-900 rounded-lg hover:bg-red-800 text-sm ml-auto"
            >
              Delete Round
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
