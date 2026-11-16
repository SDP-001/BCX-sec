export type ApiHealth = {
  status: 'UP'
  service: string
}

export type Account = {
  id: string
  displayName: string
  email: string
}

export type IntelligenceStatus = {
  provider: 'OPENAI' | 'OLLAMA'
  state:
    | 'DISABLED'
    | 'MODEL_NOT_CONFIGURED'
    | 'MODEL_NOT_INSTALLED'
    | 'API_KEY_NOT_CONFIGURED'
    | 'MODEL_NOT_AVAILABLE'
    | 'UNAVAILABLE'
    | 'READY'
  enabled: boolean
  available: boolean
  model: string | null
  detail: string
}

export type IntelligenceExplanationRequest = {
  question: string
  evidence: string
  sourceReferences: string[]
}

export type IntelligenceExplanationResponse = {
  answer: string
  model: string
  verificationStatus: 'UNVERIFIED_DRAFT'
  sourceReferences: string[]
}

export type DiagnosticRequest = {
  targetType: 'website' | 'software' | 'stack-trace'
  input: string
}

export type DiagnosticFinding = {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  title: string
  message: string
  fix: string
}

export type DiagnosticResponse = {
  targetType: string
  summary: string
  score: number
  status: 'HEALTHY' | 'WARNINGS' | 'CRITICAL'
  findings: DiagnosticFinding[]
}

async function readError(response: Response, action: string): Promise<Error> {
  let detail = `${action} failed (${response.status})`
  try {
    const body: { detail?: string; message?: string } = await response.json()
    detail = body.detail ?? body.message ?? detail
  } catch {
    // Keep the HTTP status message when the server does not return JSON.
  }
  return new Error(detail)
}

async function csrfToken(): Promise<string> {
  const response = await fetch('/api/v1/auth/csrf')
  if (!response.ok) throw await readError(response, 'Security token request')
  const body: { token: string } = await response.json()
  return body.token
}

async function postAuth<T>(endpoint: string, payload?: object): Promise<T> {
  const token = await csrfToken()
  const response = await fetch(`/api/v1/auth/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': token,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })
  if (!response.ok) throw await readError(response, 'Account request')
  return response.json() as Promise<T>
}

export async function fetchApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const response = await fetch('/api/v1/health', { signal })
  if (!response.ok) {
    throw await readError(response, 'API health check')
  }
  return response.json() as Promise<ApiHealth>
}

export async function fetchCurrentAccount(signal?: AbortSignal): Promise<Account> {
  const response = await fetch('/api/v1/auth/me', { signal })
  if (!response.ok) throw await readError(response, 'Session check')
  return response.json() as Promise<Account>
}

export async function signIn(email: string, password: string): Promise<Account> {
  return postAuth<Account>('login', { email, password })
}

export async function signUp(email: string, displayName: string, password: string): Promise<Account> {
  return postAuth<Account>('register', { email, displayName, password })
}

export async function signOut(): Promise<void> {
  const token = await csrfToken()
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'X-XSRF-TOKEN': token },
  })
  if (!response.ok) throw await readError(response, 'Sign out')
}

export async function fetchIntelligenceStatus(signal?: AbortSignal): Promise<IntelligenceStatus> {
  const response = await fetch('/api/v1/intelligence/status', { signal })
  if (!response.ok) {
    throw await readError(response, 'AI provider status check')
  }
  return response.json() as Promise<IntelligenceStatus>
}

export async function requestIntelligenceExplanation(
  request: IntelligenceExplanationRequest,
  signal?: AbortSignal,
): Promise<IntelligenceExplanationResponse> {
  const token = await csrfToken()
  const response = await fetch('/api/v1/intelligence/explanations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': token,
    },
    body: JSON.stringify(request),
    signal,
  })
  if (!response.ok) {
    throw await readError(response, 'Explanation request')
  }
  return response.json() as Promise<IntelligenceExplanationResponse>
}

export async function analyzeDiagnostic(
  request: DiagnosticRequest,
  signal?: AbortSignal,
): Promise<DiagnosticResponse> {
  const token = await csrfToken()
  const response = await fetch('/api/v1/diagnostics/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': token,
    },
    body: JSON.stringify(request),
    signal,
  })
  if (!response.ok) {
    throw await readError(response, 'Diagnostic analysis')
  }
  return response.json() as Promise<DiagnosticResponse>
}
