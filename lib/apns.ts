/**
 * Apple Push Notification service (APNs) sender.
 * Uses token-based auth (p8 key) — no Firebase or third-party libraries required.
 *
 * Required env vars (set in Vercel dashboard + .env.local):
 *   APNS_KEY      — full contents of the .p8 file from Apple Developer
 *   APNS_KEY_ID   — the 10-char Key ID shown in Apple Developer
 *   APNS_TEAM_ID  — the 10-char Team ID shown in Apple Developer
 *
 * The bundle ID is hardcoded from capacitor.config.ts (com.fourplaypicks.app).
 */

import http2 from 'node:http2'
import crypto from 'node:crypto'

const BUNDLE_ID = 'com.fourplaypicks.app'
const APNS_HOST_PROD = 'api.push.apple.com'
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com'

// Cache the JWT for up to 55 minutes (APNs tokens are valid 60 min)
let cachedJWT = ''
let jwtIssuedAt = 0

function buildJWT(): string {
  const now = Math.floor(Date.now() / 1000)
  if (cachedJWT && now - jwtIssuedAt < 55 * 60) return cachedJWT

  const keyId = process.env.APNS_KEY_ID!
  const teamId = process.env.APNS_TEAM_ID!
  const rawKey = process.env.APNS_KEY!.replace(/\\n/g, '\n')

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString('base64url')
  const unsigned = `${header}.${payload}`

  const privateKey = crypto.createPrivateKey(rawKey)
  const sign = crypto.createSign('SHA256')
  sign.update(unsigned)
  const derSig = sign.sign(privateKey)
  const sig = derToP1363(derSig).toString('base64url')

  cachedJWT = `${unsigned}.${sig}`
  jwtIssuedAt = now
  return cachedJWT
}

/**
 * APNs returns ECDSA signatures in DER (ASN.1) format; JWT requires IEEE P1363 (raw r||s).
 * DER: 0x30 len 0x02 rLen r 0x02 sLen s
 */
function derToP1363(der: Buffer): Buffer {
  let pos = 2 // skip SEQUENCE tag + length (always 1 byte for P-256)

  // r
  pos++ // skip INTEGER tag
  const rLen = der[pos++]
  const rBytes = der.slice(pos, pos + rLen)
  pos += rLen

  // s
  pos++ // skip INTEGER tag
  const sLen = der[pos++]
  const sBytes = der.slice(pos, pos + sLen)

  const norm = (b: Buffer): Buffer => {
    const trimmed = b[0] === 0 ? b.slice(1) : b
    if (trimmed.length === 32) return trimmed
    if (trimmed.length < 32) return Buffer.concat([Buffer.alloc(32 - trimmed.length), trimmed])
    return trimmed.slice(trimmed.length - 32)
  }

  return Buffer.concat([norm(rBytes), norm(sBytes)])
}

export interface PushPayload {
  title: string
  body: string
}

/**
 * Send a push notification to a single APNs device token.
 * Returns silently if env vars are missing (graceful no-op in dev).
 */
export async function sendPush(deviceToken: string, { title, body }: PushPayload): Promise<void> {
  if (!process.env.APNS_KEY_ID || !process.env.APNS_TEAM_ID || !process.env.APNS_KEY) return

  const jwt = buildJWT()
  const host = process.env.NODE_ENV === 'production' ? APNS_HOST_PROD : APNS_HOST_SANDBOX
  const apnsPayload = JSON.stringify({ aps: { alert: { title, body }, sound: 'default' } })

  return new Promise<void>((resolve, reject) => {
    const client = http2.connect(`https://${host}`)
    client.on('error', err => { client.destroy(); reject(err) })

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(apnsPayload),
    })

    req.write(apnsPayload)
    req.end()

    let status = 0
    let responseBody = ''
    req.on('response', headers => { status = Number(headers[':status']) })
    req.on('data', chunk => { responseBody += chunk })
    req.on('end', () => {
      client.close()
      if (status === 200) {
        resolve()
      } else {
        reject(new Error(`APNs ${status}: ${responseBody}`))
      }
    })
    req.on('error', err => { client.destroy(); reject(err) })
  })
}

/**
 * Send push notifications to multiple device tokens for a single user.
 * Failures for individual tokens are caught and logged so one bad token
 * doesn't block the rest.
 */
export async function sendPushToTokens(tokens: string[], payload: PushPayload): Promise<void> {
  await Promise.all(
    tokens.map(t =>
      sendPush(t, payload).catch(err => {
        console.warn(`[apns] failed to send to ${t.slice(-8)}: ${err.message}`)
      })
    )
  )
}
