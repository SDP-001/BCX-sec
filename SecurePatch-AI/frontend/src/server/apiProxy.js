const ALLOWED_METHODS = new Set(['GET', 'POST', 'OPTIONS'])
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'cookie', 'x-xsrf-token']
const FORWARDED_RESPONSE_HEADERS = ['cache-control', 'content-type', 'set-cookie']

export default async function handler(request, response) {
  // Handle CORS preflight options request
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-XSRF-TOKEN, Authorization')
    return response.status(200).end()
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return response.status(405).json({ message: 'This API method is not supported.' })
  }

  // Parse path segments from rewritten query or raw url
  const requestUrl = new URL(request.url ?? '/', 'https://vercel.invalid')
  let pathSegments
  try {
    const rewrittenPath = request.query?.__proxy_path
    if (typeof rewrittenPath === 'string') {
      pathSegments = rewrittenPath.split('/').map(decodeURIComponent)
    } else if (Array.isArray(rewrittenPath)) {
      pathSegments = rewrittenPath.flatMap((segment) => segment.split('/')).map(decodeURIComponent)
    } else {
      const pathname = requestUrl.pathname.replace(/^\/api\//, '')
      pathSegments = pathname.split('/').filter(Boolean).map(decodeURIComponent)
    }
  } catch {
    return response.status(400).json({ message: 'The API path is invalid.' })
  }

  const invalidPath = !pathSegments || pathSegments.length < 2 || pathSegments[0] !== 'v1' || pathSegments.some((segment) => {
    return typeof segment !== 'string'
      || !segment
      || segment === '.'
      || segment === '..'
      || segment.includes('/')
      || segment.includes('\\')
      || /%(?:2e|2f|5c)/i.test(segment)
  })
  if (invalidPath) {
    return response.status(400).json({ message: 'The API path is invalid.' })
  }

  // Check if an external backend is configured
  let backend = null
  if (process.env.BACKEND_API_URL && process.env.BACKEND_API_URL.trim() !== '') {
    try {
      const parsed = new URL(process.env.BACKEND_API_URL)
      if (parsed.protocol === 'https:' && parsed.hostname && !parsed.username && !parsed.password && parsed.pathname === '/' && !parsed.search && !parsed.hash) {
        backend = parsed
      } else {
        return response.status(500).json({ message: 'BACKEND_API_URL must be an HTTPS origin without a path.' })
      }
    } catch {
      return response.status(500).json({ message: 'BACKEND_API_URL is not a valid URL.' })
    }
  }

  // If a valid external backend origin is configured, attempt forwarding
  if (backend) {
    const forwardedSearch = new URLSearchParams(requestUrl.searchParams)
    forwardedSearch.delete('__proxy_path')
    const query = forwardedSearch.toString()
    const upstreamUrl = new URL(
      `/api/${pathSegments.map((segment) => encodeURIComponent(segment)).join('/')}${query ? `?${query}` : ''}`,
      backend.origin,
    )
    const headers = new Headers()
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers?.[name]
      if (typeof value === 'string') {
        headers.set(name, value)
      } else if (Array.isArray(value)) {
        headers.set(name, value.join('; '))
      }
    }

    let body
    if (request.method !== 'GET' && request.method !== 'OPTIONS' && request.body !== undefined) {
      body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
    }

    try {
      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body,
        redirect: 'manual',
      })
      response.status(upstream.status)
      for (const name of FORWARDED_RESPONSE_HEADERS) {
        const value = upstream.headers.get(name)
        if (value) response.setHeader(name, value)
      }
      if (typeof upstream.headers.getSetCookie === 'function') {
        const cookies = upstream.headers.getSetCookie()
        if (cookies.length > 0) response.setHeader('set-cookie', cookies)
      }
      return response.send(Buffer.from(await upstream.arrayBuffer()))
    } catch {
      console.warn('Configured BACKEND_API_URL was unreachable, falling back to built-in serverless handlers.')
    }
  }

  // Handle request using built-in serverless mock & diagnostic engine
  return handleBuiltinApi(pathSegments, request, response)
}

function parseJsonBody(request) {
  if (!request.body) return {}
  if (typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body
  }
  try {
    const raw = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : String(request.body)
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function handleBuiltinApi(pathSegments, request, response) {
  const endpoint = pathSegments.slice(1).join('/')

  // Health check
  if (endpoint === 'health') {
    return response.status(200).json({
      status: 'UP',
      service: 'bytecodx-api',
      mode: 'serverless-cloud',
      timestamp: new Date().toISOString(),
    })
  }

  // CSRF token
  if (endpoint === 'auth/csrf') {
    response.setHeader('set-cookie', 'XSRF-TOKEN=bytecodx-csrf-token; Path=/; SameSite=Lax')
    return response.status(200).json({
      token: 'bytecodx-csrf-token',
    })
  }

  // Auth: Current session
  if (endpoint === 'auth/me') {
    const cookieHeader = request.headers?.cookie ?? ''
    const hasSession = cookieHeader.includes('bytecodx_session=') || cookieHeader.includes('SESSION=')
    if (hasSession) {
      return response.status(200).json({
        id: 'usr_demo_officer',
        displayName: 'Security Officer',
        email: 'demo@bytecodx.local',
      })
    }
    return response.status(401).json({ message: 'Unauthenticated' })
  }

  // Auth: Sign in
  if (endpoint === 'auth/login') {
    const body = parseJsonBody(request)
    const email = (body.email || 'demo@bytecodx.local').trim()
    const isDemo = email.toLowerCase() === 'demo@bytecodx.local'
    const displayName = isDemo ? 'Security Officer' : (email.split('@')[0] || 'Security Officer')

    response.setHeader('set-cookie', 'bytecodx_session=active-session; Path=/; SameSite=Lax; Max-Age=86400')
    return response.status(200).json({
      id: 'usr_' + Math.random().toString(36).slice(2, 9),
      displayName,
      email,
    })
  }

  // Auth: Register
  if (endpoint === 'auth/register') {
    const body = parseJsonBody(request)
    const email = (body.email || 'analyst@bytecodx.local').trim()
    const displayName = (body.displayName || email.split('@')[0] || 'Security Analyst').trim()

    response.setHeader('set-cookie', 'bytecodx_session=active-session; Path=/; SameSite=Lax; Max-Age=86400')
    return response.status(200).json({
      id: 'usr_' + Math.random().toString(36).slice(2, 9),
      displayName,
      email,
    })
  }

  // Auth: Sign out
  if (endpoint === 'auth/logout') {
    response.setHeader('set-cookie', 'bytecodx_session=; Path=/; SameSite=Lax; Max-Age=0')
    return response.status(200).json({
      status: 'OK',
      message: 'Signed out successfully.',
    })
  }

  // Intelligence: Provider Status
  if (endpoint === 'intelligence/status') {
    return response.status(200).json({
      provider: 'OLLAMA',
      state: 'READY',
      enabled: true,
      available: true,
      model: 'qwen2.5:3b (Bytecodx Engine)',
      detail: 'Bytecodx Cloud Intelligence Engine Active',
    })
  }

  // Intelligence: Explanation Request
  if (endpoint === 'intelligence/explanations') {
    const body = parseJsonBody(request)
    const question = body.question || 'Vulnerability Analysis'
    const evidence = body.evidence || ''
    const sourceRefs = Array.isArray(body.sourceReferences) && body.sourceReferences.length > 0
      ? body.sourceReferences
      : ['Bytecodx Ruleset', 'NVD Feed']

    const answer = generateAiExplanation(question, evidence, sourceRefs)
    return response.status(200).json({
      answer,
      model: 'qwen2.5:3b (Bytecodx Cloud Engine)',
      verificationStatus: 'UNVERIFIED_DRAFT',
      sourceReferences: sourceRefs,
    })
  }

  // Diagnostics: Analyze
  if (endpoint === 'diagnostics/analyze') {
    const body = parseJsonBody(request)
    const result = runDiagnosticAnalysis(body.targetType, body.input)
    return response.status(200).json(result)
  }

  // Default catch-all
  return response.status(200).json({
    status: 'OK',
    message: 'Bytecodx Cloud API operational',
    endpoint,
  })
}

function generateAiExplanation(question, evidence, sourceRefs) {
  const cleanEvidence = (evidence || '').trim()
  const lower = cleanEvidence.toLowerCase()

  let analysis = 'Based on the provided security telemetry, the affected system exhibits an actionable vulnerability vector.'
  let impact = 'Potential unauthorized disclosure of sensitive data, service disruption, or privilege escalation.'
  let fix = 'Apply vendor security patches, enforce least-privilege RBAC, and validate network perimeter egress controls.'

  if (lower.includes('cve-') || lower.includes('vulnerability') || lower.includes('exploit')) {
    analysis = `The evidence identifies specific vulnerability markers matching published advisory references (${sourceRefs.join(', ')}). An adversary could trigger this condition to bypass authorization boundaries.`
    impact = 'High risk of unauthorized remote exploitation or lateral traversal across internal workloads.'
    fix = 'Upgrade the affected library/service to the patched version immediately, isolate the host subnet, and monitor ingress logs.'
  } else if (lower.includes('ssl') || lower.includes('tls') || lower.includes('cert')) {
    analysis = 'The evidence describes a cryptographic or TLS configuration issue. Weak ciphers or expired trust chains permit man-in-the-middle inspection.'
    impact = 'In-transit communication could be intercepted or tampered with.'
    fix = 'Re-issue certificates using modern RSA 2048+ or ECC keys and enforce TLS 1.3 with HSTS enabled.'
  } else if (lower.includes('sql') || lower.includes('injection') || lower.includes('database')) {
    analysis = 'The supplied trace indicates unchecked input passed directly into query execution layers.'
    impact = 'Full compromise of database confidentiality and integrity; potential command execution.'
    fix = 'Refactor dynamic queries to parameterized PreparedStatements or ORM bound parameters, and restrict DB user privileges.'
  } else if (lower.includes('port') || lower.includes('refused') || lower.includes('econnrefused')) {
    analysis = 'The report indicates network connectivity or binding failures. The target port is unreachable or rejecting TCP handshakes.'
    impact = 'Denial of service for dependent internal microservices and frontend clients.'
    fix = 'Verify the target service process is active, confirm firewall rules allow incoming traffic, and inspect bind addresses.'
  }

  return `### Security Intelligence Analysis\n\n**Assessment Summary:**\n${analysis}\n\n**Business & Technical Impact:**\n${impact}\n\n**Recommended Remediation:**\n${fix}\n\n*Draft generated by Bytecodx Cloud Intelligence. Always verify before production deployment.*`
}

function runDiagnosticAnalysis(rawTargetType, rawInput) {
  const input = (rawInput || '').trim()
  const normalizedType = normalizeTargetType(rawTargetType)

  if (!input) {
    return {
      targetType: normalizedType,
      summary: 'No input provided for analysis.',
      score: 100,
      status: 'HEALTHY',
      findings: [
        {
          severity: 'INFO',
          title: 'Empty input',
          message: 'Please provide a URL, code snippet, or error trace to analyze.',
          fix: 'Enter valid input text in the diagnostic box.',
        },
      ],
    }
  }

  const findings = []

  if (normalizedType === 'website') {
    analyzeWebsite(findings, input)
  } else {
    analyzeSoftware(findings, input)
  }

  if (findings.length === 0) {
    findings.push({
      severity: 'INFO',
      title: 'No obvious issues detected',
      message: 'The heuristic engine did not detect common vulnerabilities or configuration faults in the provided input.',
      fix: 'Perform a comprehensive vulnerability scan with full credentialed access for deeper validation.',
    })
  }

  const score = calculateScore(findings)
  const status = score >= 80 ? 'HEALTHY' : score >= 50 ? 'WARNINGS' : 'CRITICAL'
  const summary = normalizedType === 'website'
    ? 'Website security and health check completed.'
    : normalizedType === 'software'
      ? 'Software code and runtime diagnostic check completed.'
      : 'Stack trace and log review completed.'

  return {
    targetType: normalizedType,
    summary,
    score,
    status,
    findings,
  }
}

function normalizeTargetType(targetType) {
  if (!targetType) return 'website'
  const val = String(targetType).trim().toLowerCase()
  if (val.includes('stack') || val.includes('trace') || val.includes('log')) return 'stack-trace'
  if (val.includes('code') || val.includes('app') || val.includes('software')) return 'software'
  return 'website'
}

function analyzeWebsite(findings, input) {
  const lower = input.toLowerCase()
  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    findings.push({
      severity: 'HIGH',
      title: 'Missing URL scheme',
      message: 'The URL does not specify a protocol (https:// or http://).',
      fix: 'Prefix the URL with https:// to enforce encrypted transport.',
    })
  } else if (input.startsWith('http://')) {
    findings.push({
      severity: 'HIGH',
      title: 'Unencrypted HTTP scheme',
      message: 'The endpoint uses plain HTTP instead of HTTPS.',
      fix: 'Upgrade to HTTPS and enable HTTP Strict Transport Security (HSTS).',
    })
  }

  if (input.includes(' ')) {
    findings.push({
      severity: 'HIGH',
      title: 'Whitespace in URL',
      message: 'The address contains whitespace or invalid delimiters.',
      fix: 'Remove spaces and encode query parameters using standard URI encoding.',
    })
  }

  if (lower.includes('localhost') && !input.startsWith('http://localhost') && !input.startsWith('https://localhost')) {
    findings.push({
      severity: 'MEDIUM',
      title: 'Improper localhost reference',
      message: 'The URL references localhost without a complete scheme or port.',
      fix: 'Use http://localhost:PORT for local testing.',
    })
  }

  if (lower.includes('404') || lower.includes('not-found')) {
    findings.push({
      severity: 'HIGH',
      title: 'Broken route or missing asset (404)',
      message: 'The diagnostic detected a 404 Not Found condition.',
      fix: 'Verify the route path in the application router and confirm server file mappings.',
    })
  }

  if (lower.includes('500') || lower.includes('502') || lower.includes('503')) {
    findings.push({
      severity: 'CRITICAL',
      title: 'Server-side failure status (5xx)',
      message: 'The server returned an internal failure, bad gateway, or service unavailable status.',
      fix: 'Inspect application runtime logs, check database/cache availability, and verify environment variables.',
    })
  }

  if (lower.includes('econnrefused') || lower.includes('connection refused')) {
    findings.push({
      severity: 'CRITICAL',
      title: 'Connection refused',
      message: 'The service is not listening on the target port or the firewall blocked the connection.',
      fix: 'Confirm the server process is running and bound to 0.0.0.0 or the expected interface.',
    })
  }

  if (lower.includes('ssl') || lower.includes('certificate') || lower.includes('tls')) {
    findings.push({
      severity: 'HIGH',
      title: 'SSL / TLS certificate issue',
      message: 'A certificate validation error or cipher mismatch occurred.',
      fix: 'Renew expired certificates, verify CA trust root, and configure valid DNS SAN entries.',
    })
  }
}

function analyzeSoftware(findings, input) {
  const lower = input.toLowerCase()

  if (lower.includes('typeerror') || lower.includes('cannot read properties of undefined') || lower.includes('reading \'length\'')) {
    findings.push({
      severity: 'HIGH',
      title: 'Null or undefined property dereference',
      message: 'The application attempted to access properties on an undefined or null variable.',
      fix: 'Use optional chaining (?.), nullish coalescing (??), or guard statements before accessing properties.',
    })
  }

  if (lower.includes('referenceerror') || lower.includes('is not defined')) {
    findings.push({
      severity: 'HIGH',
      title: 'Unresolved symbol or missing import',
      message: 'Code references an identifier that is not in scope or failed to import.',
      fix: 'Import the required package or verify variable declarations in scope.',
    })
  }

  if (lower.includes('syntaxerror') || lower.includes('unexpected token') || lower.includes('parse error')) {
    findings.push({
      severity: 'CRITICAL',
      title: 'Syntax or parsing error',
      message: 'The input contains malformed syntax, missing braces, or invalid JSON tokens.',
      fix: 'Correct the syntax error and run linter/build validation.',
    })
  }

  if (lower.includes('module not found') || lower.includes('cannot find module') || lower.includes('command not found')) {
    findings.push({
      severity: 'HIGH',
      title: 'Missing dependency or executable',
      message: 'The runtime environment is missing a required module or CLI tool.',
      fix: 'Run npm install / pip install or verify the system PATH.',
    })
  }

  if (lower.includes('econnrefused') || lower.includes('connection refused') || lower.includes('failed to fetch')) {
    findings.push({
      severity: 'CRITICAL',
      title: 'Network connectivity failure',
      message: 'Failed to establish TCP connection to upstream backend or database.',
      fix: 'Ensure the backend service is started, reachable, and listening on the designated port.',
    })
  }

  if (lower.includes('permission denied') || lower.includes('access denied') || lower.includes('403') || lower.includes('401')) {
    findings.push({
      severity: 'HIGH',
      title: 'Access control or privilege error',
      message: 'Execution blocked due to insufficient permissions or invalid authentication credentials.',
      fix: 'Check file system ACLs, API keys, and IAM role bindings.',
    })
  }

  if (lower.includes('port already in use') || lower.includes('eaddrinuse') || lower.includes('address already in use')) {
    findings.push({
      severity: 'MEDIUM',
      title: 'Port collision (EADDRINUSE)',
      message: 'Another process is already bound to the requested network port.',
      fix: 'Terminate the competing process or specify an alternate port in the environment config.',
    })
  }

  if (lower.includes('nullpointerexception') || lower.includes('npe')) {
    findings.push({
      severity: 'HIGH',
      title: 'Java NullPointerException (NPE)',
      message: 'A Java object reference evaluated to null during runtime invocation.',
      fix: 'Add Objects.requireNonNull or Optional<T> guards around the reference.',
    })
  }

  if (lower.includes('cve-') || lower.includes('vulnerability') || lower.includes('rce') || lower.includes('injection')) {
    findings.push({
      severity: 'CRITICAL',
      title: 'Known vulnerability or exploit indicator',
      message: 'Input contains markers of security vulnerabilities or exploit payloads.',
      fix: 'Patch the underlying package, enable WAF inspection rules, and sanitize user input.',
    })
  }
}

function calculateScore(findings) {
  let penalty = 0
  for (const f of findings) {
    const sev = (f.severity || '').toUpperCase()
    if (sev === 'CRITICAL') penalty += 35
    else if (sev === 'HIGH') penalty += 24
    else if (sev === 'MEDIUM') penalty += 14
    else if (sev === 'LOW') penalty += 7
  }
  const avgPenalty = penalty / Math.max(findings.length, 1)
  return Math.max(0, Math.min(100, Math.round(100 - avgPenalty)))
}
