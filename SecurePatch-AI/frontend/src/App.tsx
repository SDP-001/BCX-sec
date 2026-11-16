import { useEffect, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Box,
  Check,
  ChevronDown,
  Command,
  FileBarChart,
  Fingerprint,
  Gauge,
  Globe2,
  LoaderCircle,
  Layers3,
  LockKeyhole,
  LogOut,
  Moon,
  MoreHorizontal,
  Plus,
  Radar,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import {
  analyzeDiagnostic,
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
      { label: 'Assets', icon: Box },
      { label: 'Error checker', icon: Shield },
      { label: 'Vulnerabilities', icon: Shield },
      { label: 'Scan activity', icon: Radar },
      { label: 'Remediation', icon: Check },
    ],
  },
]

const moduleDetails: Record<string, { summary: string; requirements: string[]; workflow?: { title: string; description: string }[] }> = {
  Assets: {
    summary: 'Register only systems your organization owns or has explicit permission to assess.',
    requirements: ['Asset API and organization access controls are not configured yet.', 'No asset records are seeded or fabricated.'],
    workflow: [
      { title: 'Define authorized scope', description: 'List only systems your organization owns or has explicit permission to assess.' },
      { title: 'Record ownership context', description: 'Capture environment and responsible team so assets can be reviewed and maintained.' },
      { title: 'Review before assessment', description: 'Confirm scope, approval, and timing before connecting any scanner.' },
    ],
  },
  'Error checker': {
    summary: 'Paste a website URL, a stack trace, or software text and get a rapid diagnosis with a fix suggestion.',
    requirements: ['This checker provides heuristic guidance, not a live production scanner.', 'Every result should still be reviewed by a human before being applied.'],
  },
  Vulnerabilities: {
    summary: 'Review findings only after scanner integrations and trusted vulnerability sources are connected.',
    requirements: ['No scanner findings or CVE data are available in this workspace.', 'Findings will show their source and verification state when implemented.'],
    workflow: [
      { title: 'Collect sourced evidence', description: 'Keep the scanner, observation time, affected asset, and evidence with each finding.' },
      { title: 'Validate the result', description: 'Confirm the affected component and version before treating a detection as actionable.' },
      { title: 'Prioritize with context', description: 'Consider severity, exploit evidence, and asset importance together.' },
    ],
  },
  'Scan activity': {
    summary: 'Scanner jobs must be scoped to authorized assets and run through isolated adapters.',
    requirements: ['No scanner adapters are connected.', 'No scan jobs have been started or simulated.'],
    workflow: [
      { title: 'Select approved scope', description: 'Choose assets with documented authorization and a clear assessment boundary.' },
      { title: 'Configure an adapter', description: 'Connect an approved scanner with limited credentials and an agreed scan window.' },
      { title: 'Review completion', description: 'Check job status, coverage, and result source before acting on findings.' },
    ],
  },
  Remediation: {
    summary: 'Track human-approved remediation, mitigation, and risk-acceptance decisions.',
    requirements: ['Remediation task and approval workflows are not configured.', 'No patches are deployed automatically.'],
    workflow: [
      { title: 'Triage a verified issue', description: 'Confirm evidence, impact, and the affected asset before assigning work.' },
      { title: 'Plan an approved change', description: 'Assign an owner, test the change, and document any mitigation or exception.' },
      { title: 'Verify and record closure', description: 'Recheck the original evidence source and retain the result for auditability.' },
    ],
  },
  'Risk analysis': {
    summary: 'Prioritization will combine verified vulnerability data with exploitation and asset context.',
    requirements: ['CVSS, EPSS, KEV, and asset criticality data are not connected.', 'No risk scores are estimated from missing data.'],
  },
  Reports: {
    summary: 'Reports should reflect recorded assets, verified findings, and remediation history.',
    requirements: ['There is no assessment data to report yet.', 'Report export will be available when report data is implemented.'],
  },
  Team: {
    summary: 'Team access requires authenticated accounts, organization boundaries, and server-side roles.',
    requirements: ['Registration and sign-in are available; organization membership and role administration are not configured.', 'New accounts currently receive the viewer role.'],
  },
}

const metrics = [
  { label: 'Tracked assets', value: '—', foot: 'No assets registered', icon: Box, accent: 'mint' },
  { label: 'Open findings', value: '—', foot: 'No verified scan data', icon: ShieldCheck, accent: 'blue' },
  { label: 'Critical risk', value: '—', foot: 'Risk scoring not configured', icon: Fingerprint, accent: 'amber' },
  { label: 'Active scans', value: '0', foot: 'No scans running', icon: Radar, accent: 'violet' },
]

const DEMO_ACCOUNT_EMAIL = 'demo@bytecodx.local'
const DEMO_ACCOUNT_PASSWORD = 'BytecodxDemo2026!'

function App() {
  const reduceMotion = useReducedMotion() ?? false
  const [apiState, setApiState] = useState<'checking' | 'connected' | 'offline'>('checking')
  const [darkMode, setDarkMode] = useState(false)
  const [activePage, setActivePage] = useState('Overview')
  const [trendRange, setTrendRange] = useState('7')
  const [showRiskDetails, setShowRiskDetails] = useState(false)
  const [account, setAccount] = useState<Account | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [signOutError, setSignOutError] = useState('')

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
        if (!controller.signal.aborted) setApiState('offline')
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
          <span className="org-avatar">O</span>
          <span className="org-copy"><strong>My organization</strong><small>Workspace</small></span>
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
              {apiState === 'checking' ? 'Connecting to API' : apiState === 'connected' ? 'API connected' : 'API unavailable'}
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
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
        >
        {activePage === 'Overview' ? (
          <>
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> SECURITY POSTURE <span className="eyebrow-date">/ {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span></div>
              <h1>Your exposure, <span>at a glance.</span></h1>
              <p className="welcome-copy">A clear view of your assets, risk, and the work ahead.</p>
            </div>
            <button className="primary-button" onClick={() => navigateTo('Assets')} type="button">
              <Plus size={17} /> Asset inventory <ArrowRight size={14} />
            </button>
          </section>

          <motion.section
            className="setup-banner"
            id="setup"
            initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reduceMotion ? 0 : 0.35 }}
          >
            <div className="banner-symbol"><LockKeyhole size={20} /></div>
            <div className="banner-text">
              <strong>Your workspace is ready for its first asset.</strong>
              <span>Connect your foundation now. Asset inventory and authorized scanning arrive in the next phase.</span>
            </div>
            <div className="banner-progress" aria-label="Development progress: phase 1 of 8">
              <div className="progress-ring"><span>01</span></div>
              <span>PHASE 1 <b>/ 08</b></span>
            </div>
          </motion.section>

          <section className="metric-grid" aria-label="Workspace summary">
            {metrics.map(({ label, value, foot, icon: Icon, accent }, index) => (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className="metric-card"
                initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 }}
                key={label}
                viewport={{ once: true }}
                transition={{ delay: reduceMotion ? 0 : index * 0.07, duration: reduceMotion ? 0 : 0.35 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <div className="metric-top">
                  <span className="metric-label">{label}</span>
                  <span className={`metric-icon ${accent}`}><Icon size={17} strokeWidth={1.8} /></span>
                </div>
                <div className="metric-value">{value}</div>
                <div className="metric-foot"><span className="metric-foot-dot" />{foot}</div>
              </motion.article>
            ))}
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
                <div><p className="panel-kicker">RISK INTELLIGENCE</p><h2>Exposure over time</h2></div>
                <label className="period-select">
                  <span className="sr-only">Trend period</span>
                  <select aria-label="Trend period" onChange={(event) => setTrendRange(event.target.value)} value={trendRange}>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              <div className="chart-legend"><span className="legend-mark" />Exposure score</div>
              <div className="chart-area">
                <div className="chart-empty">
                  <span className="empty-chart-icon"><Activity size={17} /></span>
                  <strong>No verified exposure data for the last {trendRange} days</strong>
                  <span>Completed scans are needed before this chart can show a trend.</span>
                </div>
              </div>
              <div className="chart-footer"><span>Source: verified findings only</span><span>Updated when scans are connected</span></div>
            </motion.article>

            <motion.article
              className="panel risk-panel"
              initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.08 }}
            >
              <div className="panel-heading">
                <div><p className="panel-kicker">PRIORITIZATION</p><h2>Risk distribution</h2></div>
                <button className="more-button" aria-expanded={showRiskDetails} onClick={() => setShowRiskDetails(!showRiskDetails)} type="button" aria-label="Risk distribution details"><MoreHorizontal size={19} /></button>
              </div>
              {showRiskDetails && (
                <motion.p
                  className="risk-details"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 11 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                >
                  Risk scoring is not configured. Scores will require verified vulnerability data, exploitation intelligence, and asset context.
                </motion.p>
              )}
              <div className="risk-empty">
                <div className="risk-orbit orbit-outer"><span /><div className="orbit-inner"><ShieldCheck size={24} /></div></div>
                <strong>Nothing to prioritize yet</strong>
                <p>Risk levels are calculated from verified findings and asset context.</p>
              </div>
              <div className="risk-legend">
                <div><i className="severity-dot critical" />Critical <b>—</b></div>
                <div><i className="severity-dot high" />High <b>—</b></div>
                <div><i className="severity-dot medium" />Medium <b>—</b></div>
                <div><i className="severity-dot low" />Low <b>—</b></div>
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
                <div><p className="panel-kicker">OPERATIONS</p><h2>Recent activity</h2></div>
                <button className="text-button" onClick={() => navigateTo('Scan activity')} type="button">View scan activity <ArrowRight size={14} /></button>
              </div>
              <div className="activity-empty">
                <div className="activity-empty-icon"><Layers3 size={19} /></div>
                <strong>No activity to show</strong>
                <span>Asset registrations and completed scans will show up here.</span>
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
                <div><p className="panel-kicker">GETTING STARTED</p><h2>Foundation checklist</h2></div>
                <span className="checklist-count">{apiState === 'connected' ? '1' : '0'} of 4</span>
              </div>
              <div className="checklist">
                <div className={`check-row${apiState === 'connected' ? ' complete' : ''}`}><span className="check-status">{apiState === 'connected' ? <Check size={12} /> : <Activity size={12} />}</span><span><strong>Application workspace</strong><small>{apiState === 'connected' ? 'Frontend and API are connected' : apiState === 'offline' ? 'API connection could not be established' : 'Checking API connection'}</small></span>{apiState === 'connected' ? <span className="check-tag">READY</span> : <span className="check-tag">{apiState === 'offline' ? 'OFFLINE' : 'CHECKING'}</span>}</div>
                <div className="check-row"><span className="check-status"><Globe2 size={12} /></span><span><strong>Register authorized assets</strong><small>Asset inventory · next phase</small></span><ArrowUpRight className="check-arrow" size={15} /></div>
                <div className="check-row"><span className="check-status"><Command size={12} /></span><span><strong>Configure scan integrations</strong><small>Scanner setup · upcoming phase</small></span><ArrowUpRight className="check-arrow" size={15} /></div>
                <div className="check-row"><span className="check-status"><FileBarChart size={12} /></span><span><strong>Review your first assessment</strong><small>Reports · upcoming phase</small></span><ArrowDownRight className="check-arrow muted" size={15} /></div>
              </div>
            </motion.article>
          </section>

          <IntelligenceWorkspace />
          </>
        ) : (
          <ModulePage page={activePage} onNavigate={navigateTo} />
        )}

          <footer className="page-footer">
            <span><span className="footer-brand-dot" /> Bytecodx <span className="footer-separator">·</span> Local intelligence, verified sources</span>
            <span>FOUNDATION BUILD <span className="footer-separator">/</span> 0.1.0</span>
          </footer>
        </motion.div>
        </div>
      </main>
    </div>
  )
}

function ModulePage({ page, onNavigate }: { page: string; onNavigate: (page: string) => void }) {
  const reduceMotion = useReducedMotion() ?? false
  const details = moduleDetails[page]
  const Icon = navigation.flatMap((group) => group.items).find((item) => item.label === page)?.icon ?? Layers3

  if (page === 'Error checker') {
    return <ErrorCheckerPage onNavigate={onNavigate} />
  }

  if (!details) {
    return (
      <section className="module-page panel">
        <h1>Page not found</h1>
        <button className="primary-button" onClick={() => onNavigate('Overview')} type="button">Return to overview</button>
      </section>
    )
  }

  return (
    <section className="module-page">
      <div className="eyebrow"><span className="eyebrow-line" /> WORKSPACE MODULE</div>
      <motion.div
        className="module-hero"
        initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <span className="module-icon"><Icon size={22} /></span>
        <div>
          <h1>{page}</h1>
          <p>{details.summary}</p>
        </div>
      </motion.div>
      <motion.article
        className="panel module-status"
        initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: reduceMotion ? 0 : 0.35 }}
      >
        <span className="module-status-badge"><i /> NOT CONFIGURED</span>
        <h2>This module is available to explore, but its backend workflow is not implemented yet.</h2>
        <p>To avoid misleading results, this workspace does not invent records or mark placeholder actions as completed.</p>
        <ul>{details.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
        <button className="primary-button" onClick={() => onNavigate('Overview')} type="button">
          <ArrowRight className="back-arrow" size={14} /> Return to overview
        </button>
      </motion.article>
      {details.workflow && (
        <section className="module-workflow" aria-label={`${page} workflow guidance`}>
          <div className="module-workflow-heading">
            <p className="panel-kicker">WORKFLOW GUIDANCE</p>
            <h2>{page} lifecycle</h2>
            <p>These are recommended steps, not completed actions or live assessment results.</p>
          </div>
          <div className="workflow-grid">
            {details.workflow.map((step, index) => (
              <motion.article
                className="panel workflow-card"
                initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : index * 0.07 }}
                key={step.title}
              >
                <span className="workflow-step">STEP 0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </motion.article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}

function ErrorCheckerPage({ onNavigate }: { onNavigate: (page: string) => void }) {
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
      setError('Paste a URL, error log, or software snippet before checking.')
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

  return (
    <section className="module-page">
      <div className="eyebrow"><span className="eyebrow-line" /> WORKSPACE MODULE</div>
      <div className="module-hero">
        <span className="module-icon"><Shield size={22} /></span>
        <div>
          <h1>Error checker</h1>
          <p>Review the issue quickly and get actionable fixes for a website, stack trace, or code snippet.</p>
        </div>
      </div>

      <article className="panel module-status diagnostic-panel">
        <div className="diagnostic-header-row">
          <span className="module-status-badge"><i /> DIAGNOSTICS</span>
          <button className="text-button" onClick={() => onNavigate('Overview')} type="button">Back to overview</button>
        </div>

        <form className="diagnostic-form" onSubmit={handleSubmit}>
          <label className="diagnostic-selector">
            <span>Check type</span>
            <select aria-label="Check type" onChange={(event) => setTargetType(event.target.value as 'website' | 'software' | 'stack-trace')} value={targetType}>
              <option value="website">Website URL</option>
              <option value="software">Software or code</option>
              <option value="stack-trace">Stack trace</option>
            </select>
          </label>
          <label className="diagnostic-input">
            <span>{targetType === 'website' ? 'Website URL or error page' : targetType === 'software' ? 'Software text or snippet' : 'Error log or stack trace'}</span>
            <textarea
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                targetType === 'website'
                  ? 'https://example.com/login\nOr paste a browser error such as ERR_CONNECTION_REFUSED'
                  : targetType === 'software'
                    ? 'TypeError: Cannot read properties of undefined\n\nconst data = response.items; console.log(data.length);'
                    : 'java.lang.NullPointerException\n at com.example.Service.load(Service.java:42)'
              }
              required
              rows={8}
              value={input}
            />
          </label>
          <div className="diagnostic-actions">
            <button className="generate-button" disabled={loading} type="submit">
              {loading ? <RefreshCw className="spinning" size={15} /> : <ShieldCheck size={15} />}
              {loading ? 'Checking…' : 'Check for errors'}
            </button>
          </div>
        </form>

        {error && <p className="auth-error" role="alert">{error}</p>}

        {loading && (
          <motion.div
            className="diagnostic-scanning"
            initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
          >
            <div className="diagnostic-radar">
              <span className="radar-core"><ShieldCheck size={15} /></span>
              <span className="radar-ring ring-one" />
              <span className="radar-ring ring-two" />
              <span className="radar-ring ring-three" />
            </div>
            <strong>Checking for issues…</strong>
            <p>Scanning the URL, code, or stack trace for likely errors and fixes.</p>
          </motion.div>
        )}

        {!result && !loading && (
          <motion.div
            className="diagnostic-empty-state"
            initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
          >
            <div className="diagnostic-radar">
              <span className="radar-core"><Shield size={15} /></span>
              <span className="radar-ring ring-one" />
              <span className="radar-ring ring-two" />
              <span className="radar-ring ring-three" />
            </div>
            <strong>Ready to inspect</strong>
            <p>Paste a URL, code snippet, or stack trace to surface the likely issue and the recommended fix.</p>
          </motion.div>
        )}

        {result && (
          <motion.div
            className="diagnostic-result"
            initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
            aria-live="polite"
          >
            <div className="diagnostic-alert-card">
              <div className="diagnostic-alert-head">
                <span>Detected issue</span>
                <strong>{result.status}</strong>
              </div>
              <h3>{primaryFinding ? primaryFinding.title : 'No obvious issue found'}</h3>
              <p>{primaryFinding ? primaryFinding.message : result.summary}</p>
              {primaryFinding && (
                <div className="diagnostic-fix highlight"><strong>Fix:</strong> {primaryFinding.fix}</div>
              )}
            </div>

            <div className="diagnostic-summary-row">
              <strong>{result.status}</strong>
              <span>{result.score}/100 health score</span>
            </div>
            <p>{result.summary}</p>
            <div className="diagnostic-finding-list">
              {result.findings.map((finding) => (
                <article className="diagnostic-finding" key={`${finding.title}-${finding.message}`}>
                  <div className="diagnostic-finding-head">
                    <span className={`severity-badge ${finding.severity.toLowerCase()}`}>{finding.severity}</span>
                    <h3>{finding.title}</h3>
                  </div>
                  <p>{finding.message}</p>
                  <div className="diagnostic-fix"><strong>Fix:</strong> {finding.fix}</div>
                </article>
              ))}
            </div>
          </motion.div>
        )}
      </article>
    </section>
  )
}

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
    if (apiState !== 'connected') {
      setError(apiState === 'offline'
        ? 'The API is unavailable. Start it with the demo profile on port 5002, then reload this page.'
        : 'Wait for the API connection check to finish before signing in.')
      return
    }
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
            <span className="auth-illustration-badge"><i /> LOCAL PROTECTION</span>
          </motion.div>
          <span className="auth-eyebrow">SECURITY, WITH CLARITY.</span>
          <h1>Know what matters.<br /><span>Fix what counts.</span></h1>
          <p>One calm workspace to organize authorized assets, understand verified findings, and track the work that reduces risk.</p>
        </motion.div>
        <div className="auth-trust"><LockKeyhole size={15} /> Local-first intelligence · No external AI keys</div>
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
          <span className={`auth-api-state ${apiState}`}><i /> API {apiState === 'connected' ? 'connected' : apiState === 'checking' ? 'checking' : 'unavailable'}</span>
          <p className="auth-kicker">{mode === 'signin' ? 'WELCOME BACK' : 'GET STARTED'}</p>
          <h2>{mode === 'signin' ? 'Sign in to Bytecodx' : 'Create your account'}</h2>
          <p className="auth-subtitle">{mode === 'signin' ? 'Use your organization account to continue.' : 'Create an account to open your security workspace.'}</p>
          {apiState === 'offline' && (
            <p className="auth-api-warning" role="status">
              API unavailable. Start the local demo backend on port 5002, then reload this page.
            </p>
          )}

          {import.meta.env.DEV && mode === 'signin' && (
            <aside className="demo-login-card" aria-label="Local demo account">
              <div className="demo-login-heading">
                <ShieldCheck size={16} />
                <span><strong>Try the demo workspace</strong><small>Viewer access · local demo profile</small></span>
              </div>
              <dl className="demo-login-credentials">
                <div><dt>Email</dt><dd><code>{DEMO_ACCOUNT_EMAIL}</code></dd></div>
                <div><dt>Password</dt><dd><code>{DEMO_ACCOUNT_PASSWORD}</code></dd></div>
              </dl>
              <button className="demo-login-button" onClick={useDemoAccount} type="button">
                Fill sign-in form <ArrowRight size={13} />
              </button>
              <p className="demo-login-note">Requires the API running with the <code>demo</code> profile. This does not bypass authentication.</p>
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
            <button className="auth-submit" disabled={submitting || apiState !== 'connected'} type="submit">
              {submitting && <LoaderCircle className="spinning" size={15} />}
              {apiState === 'checking' ? 'Checking API…' : apiState === 'offline' ? 'API unavailable' : submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
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

  async function refreshStatus() {
    setRefreshing(true)
    setStatusError('')
    try {
      setStatus(await fetchIntelligenceStatus())
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Could not check the AI provider.')
    } finally {
      setRefreshing(false)
    }
  }

  async function generateExplanation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setExplanation(null)
    setExplanationError('')
    const sourceLabels = sourceReferences.split(',').map((source) => source.trim()).filter(Boolean)
    if (!question.trim() || !evidence.trim() || sourceLabels.length === 0 || sourceLabels.length > 10 || sourceLabels.some((source) => source.length > 200)) {
      setExplanationError('Add a question, evidence, and 1–10 source labels (each no longer than 200 characters).')
      return
    }

    setGenerating(true)
    try {
      setExplanation(await requestIntelligenceExplanation({
        question: question.trim(),
        evidence: evidence.trim(),
        sourceReferences: sourceLabels,
      }))
    } catch (error) {
      setExplanationError(error instanceof Error ? error.message : 'The explanation request failed.')
    } finally {
      setGenerating(false)
    }
  }

  const statusLabel = (() => {
    if (statusError) return 'API unavailable'
    switch (status?.state) {
      case 'READY':
        return 'Provider ready'
      case 'DISABLED':
        return 'Not enabled'
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
        return 'Checking status'
    }
  })()
  const statusTone = status?.available
    ? 'ready'
    : statusError || status?.state === 'UNAVAILABLE' || status?.state === 'API_KEY_NOT_CONFIGURED'
      ? 'offline'
      : 'pending'
  const providerName = status?.provider === 'OPENAI' ? 'OpenAI' : status?.provider === 'OLLAMA' ? 'Ollama' : 'AI'
  const providerDescription = status?.provider === 'OPENAI'
    ? 'The configured external provider receives this evidence; never include secrets.'
    : status?.provider === 'OLLAMA'
      ? 'The local model does not verify findings or sources.'
      : 'Connect the backend to see provider details.'

  return (
    <section className="panel ollama-panel" aria-labelledby="intelligence-title">
      <div className="ollama-heading">
        <div className="ollama-title-group">
          <span className="ollama-mark"><Bot size={19} /></span>
          <div>
            <p className="panel-kicker">SERVER-CONFIGURED AI PROVIDER</p>
            <h2 id="intelligence-title">Ask your AI provider</h2>
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
        <span><strong>Connection</strong>{statusError || status?.detail || 'Checking AI provider configuration…'}</span>
        <span><strong>Provider / model</strong>{status ? `${providerName} · ${status.model || 'Not configured'}` : 'Checking configuration…'}</span>
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
          <span>Evidence <small>Use verified source material; do not include secrets.</small></span>
          <textarea
            maxLength={8000}
            onChange={(event) => setEvidence(event.target.value)}
            placeholder="Paste the relevant vulnerability or scanner evidence here."
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
            placeholder="e.g. NVD record, vendor advisory"
            required
            value={sourceReferences}
          />
        </label>
        <div className="ollama-submit-row">
          <span>Uses the backend-configured {providerName} provider · up to 512 tokens · always requires human review</span>
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
            <strong><Sparkles size={14} /> Unverified model draft</strong>
            <span>{explanation.model} · {explanation.verificationStatus.replace('_', ' ')}</span>
          </div>
          <p>{explanation.answer}</p>
          <div className="result-sources">Caller-supplied labels: {explanation.sourceReferences.join(', ')}</div>
        </div>
      )}
    </section>
  )
}

export default App
