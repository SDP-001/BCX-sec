import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import handler from '../api/[...path].js'

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

test('reports an explicit configuration error when the backend URL is missing', async () => {
  delete process.env.BACKEND_API_URL
  const response = createResponse()

  await handler({ method: 'GET', query: { path: ['v1', 'health'] }, url: '/api/v1/health' }, response)

  assert.equal(response.statusCode, 503)
  assert.match(response.body.message, /backend API is not configured/)
})

test('forwards API requests and cookies without forwarding client-supplied API keys', async () => {
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
    query: { path: ['v1', 'auth', 'login'] },
    url: '/api/v1/auth/login?source=web',
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
  await handler({ method: 'GET', query: { path: ['v1', 'health'] }, url: '/api/v1/health' }, insecureResponse)
  assert.equal(insecureResponse.statusCode, 500)

  process.env.BACKEND_API_URL = 'https://api.example.test'
  const methodResponse = createResponse()
  await handler({ method: 'DELETE', query: { path: ['v1', 'health'] }, url: '/api/v1/health' }, methodResponse)
  assert.equal(methodResponse.statusCode, 405)

  const traversalResponse = createResponse()
  await handler({
    method: 'GET',
    query: { path: ['..', 'actuator', 'env'] },
    url: '/api/../actuator/env',
  }, traversalResponse)
  assert.equal(traversalResponse.statusCode, 400)
})
