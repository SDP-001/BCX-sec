const ALLOWED_METHODS = new Set(['GET', 'POST', 'OPTIONS'])
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'cookie', 'x-xsrf-token']
const FORWARDED_RESPONSE_HEADERS = ['cache-control', 'content-type', 'set-cookie']

export default async function handler(request, response) {
  if (!ALLOWED_METHODS.has(request.method)) {
    return response.status(405).json({ message: 'This API method is not supported.' })
  }

  let backend
  try {
    backend = new URL(process.env.BACKEND_API_URL ?? '')
  } catch {
    return response.status(503).json({ message: 'The backend API is not configured for this deployment.' })
  }

  if (
    backend.protocol !== 'https:'
    || !backend.hostname
    || backend.username
    || backend.password
    || backend.pathname !== '/'
    || backend.search
    || backend.hash
  ) {
    return response.status(500).json({ message: 'BACKEND_API_URL must be an HTTPS origin without a path.' })
  }

  const rawPath = request.query?.path
  const pathSegments = Array.isArray(rawPath)
    ? rawPath
    : typeof rawPath === 'string'
      ? rawPath.split('/')
      : []
  if (
    pathSegments.length === 0
    || pathSegments.some((segment) => typeof segment !== 'string'
      || !segment
      || segment === '.'
      || segment === '..'
      || segment.includes('/')
      || segment.includes('\\'))
  ) {
    return response.status(400).json({ message: 'The API path is invalid.' })
  }

  const requestUrl = new URL(request.url ?? '/', 'https://vercel.invalid')
  const upstreamUrl = new URL(
    `/api/${pathSegments.map((segment) => encodeURIComponent(segment)).join('/')}${requestUrl.search}`,
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
    console.error('The API proxy could not reach the configured backend.')
    return response.status(502).json({ message: 'The backend API could not be reached.' })
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
}
