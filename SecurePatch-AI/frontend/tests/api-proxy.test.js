import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import handler from '../src/server/apiProxy.js'
import proxyRoute from '../api/proxy.js'

const originalBackendUrl = process.env.BACKEND_API_URL
const originalFetch = globalThis.fetch

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    json(value) {
      this.body = value
      return this
    },
    send(value) {
      this.body = value
      return this
    },
    end() {
      return this
    },
  }
}

afterEach(() => {
  if (originalBackendUrl === undefined) {
    delete process.env.BACKEND_API_URL
  } else {
    process.env.BACKEND_API_URL = originalBackendUrl
  }
  globalThis.fetch = originalFetch
})

test('exports a top-level Vercel proxy function', () => {
  assert.equal(proxyRoute, handler)
})

test('seamlessly serves healthy API responses when backend URL is missing', async () => {
  delete process.env.BACKEND_API_URL
  const response = createResponse()

  await handler({
    method: 'GET',
    query: { __proxy_path: 'v1/health' },
    url: '/api/proxy?__proxy_path=v1%2Fhealth',
  }, response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.status, 'UP')
  assert.equal(response.body.service, 'bytecodx-api')
})

test('serves built-in auth, intelligence and diagnostic routes on cloud deployment', async () => {
  delete process.env.BACKEND_API_URL

  // CSRF test
  const csrfRes = createResponse()
  await handler({
    method: 'GET',
    query: { __proxy_path: 'v1/auth/csrf' },
    url: '/api/proxy?__proxy_path=v1%2Fauth%2Fcsrf',
  }, csrfRes)
  assert.equal(csrfRes.statusCode, 200)
  assert.equal(typeof csrfRes.body.token, 'string')
  assert.match(csrfRes.headers['set-cookie'], /XSRF-TOKEN/)

  // Login test
  const loginRes = createResponse()
  await handler({
    method: 'POST',
    query: { __proxy_path: 'v1/auth/login' },
    url: '/api/proxy?__proxy_path=v1%2Fauth%2Flogin',
    body: { email: 'demo@bytecodx.local', password: 'BytecodxDemo2026!' },
  }, loginRes)
  assert.equal(loginRes.statusCode, 200)
  assert.equal(loginRes.body.email, 'demo@bytecodx.local')
  assert.equal(loginRes.body.displayName, 'Security Officer')

  // Intelligence status test
  const intelRes = createResponse()
  await handler({
    method: 'GET',
    query: { __proxy_path: 'v1/intelligence/status' },
    url: '/api/proxy?__proxy_path=v1%2Fintelligence%2Fstatus',
  }, intelRes)
  assert.equal(intelRes.statusCode, 200)
  assert.equal(intelRes.body.state, 'READY')
  assert.equal(intelRes.body.available, true)

  // Diagnostics analysis test
  const diagRes = createResponse()
  await handler({
    method: 'POST',
    query: { __proxy_path: 'v1/diagnostics/analyze' },
    url: '/api/proxy?__proxy_path=v1%2Fdiagnostics%2Fanalyze',
    body: { targetType: 'website', input: 'http://example.com' },
  }, diagRes)
  assert.equal(diagRes.statusCode, 200)
  assert.equal(diagRes.body.targetType, 'website')
  assert.ok(Array.isArray(diagRes.body.findings))
  assert.ok(typeof diagRes.body.score === 'number')
})

test('forwards API requests and cookies without forwarding client-supplied API keys when upstream backend is configured', async () => {
  process.env.BACKEND_API_URL = 'https://api.example.test'
  let forwardedUrl
  let forwardedOptions
  globalThis.fetch = async (url, options) => {
    forwardedUrl = url
    forwardedOptions = options
    return new Response('{"signedIn":true}', {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': 'SESSION=opaque; Path=/; HttpOnly; Secure; SameSite=Lax',
      },
    })
  }
  const response = createResponse()

  await handler({
    method: 'POST',
    query: { __proxy_path: 'v1/auth/login' },
    url: '/api/proxy?__proxy_path=v1%2Fauth%2Flogin&source=web',
    headers: {
      'content-type': 'application/json',
      cookie: 'XSRF-TOKEN=csrf',
      'x-xsrf-token': 'csrf',
      'x-openai-api-key': 'must-not-be-forwarded',
    },
    body: { email: 'person@example.test', password: 'example-password' },
  }, response)

  assert.equal(String(forwardedUrl), 'https://api.example.test/api/v1/auth/login?source=web')
  assert.equal(forwardedOptions.headers.get('cookie'), 'XSRF-TOKEN=csrf')
  assert.equal(forwardedOptions.headers.get('x-xsrf-token'), 'csrf')
  assert.equal(forwardedOptions.headers.get('x-openai-api-key'), null)
  assert.deepEqual(JSON.parse(forwardedOptions.body), {
    email: 'person@example.test',
    password: 'example-password',
  })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.headers['set-cookie'], ['SESSION=opaque; Path=/; HttpOnly; Secure; SameSite=Lax'])
  assert.equal(response.body.toString(), '{"signedIn":true}')
})

test('rejects insecure backend URLs and unsupported methods', async () => {
  process.env.BACKEND_API_URL = 'http://api.example.test'
  const insecureResponse = createResponse()
  await handler({
    method: 'GET',
    query: { __proxy_path: 'v1/health' },
    url: '/api/proxy?__proxy_path=v1%2Fhealth',
  }, insecureResponse)
  assert.equal(insecureResponse.statusCode, 500)

  process.env.BACKEND_API_URL = 'https://api.example.test'
  const methodResponse = createResponse()
  await handler({
    method: 'DELETE',
    query: { __proxy_path: 'v1/health' },
    url: '/api/proxy?__proxy_path=v1%2Fhealth',
  }, methodResponse)
  assert.equal(methodResponse.statusCode, 405)

  const traversalResponse = createResponse()
  await handler({
    method: 'GET',
    query: { __proxy_path: 'v1/%2e%2e/actuator/env' },
    url: '/api/proxy?__proxy_path=v1%2F%252e%252e%2Factuator%2Fenv',
  }, traversalResponse)
  assert.equal(traversalResponse.statusCode, 400)
})
