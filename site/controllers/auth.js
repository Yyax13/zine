import 'dotenv/config'
import { SignJWT, jwtVerify, compactDecrypt, CompactEncrypt, importJWK } from 'jose'
import bcrypt from 'bcrypt'
import { User } from './db.js'

// Config from env
const SIGN_SECRET = process.env.JWT_SIGN_SECRET 
const ENC_KEY_BASE64 = process.env.JWT_ENC_KEY 

if (!SIGN_SECRET) {
    throw new Error('JWT_SIGN_SECRET is not set')
}

if (process.env.NODE_ENV === 'production' && !ENC_KEY_BASE64) {
    throw new Error('JWT_ENC_KEY must be set in production')
}

// Helper to create a JWS (signed) then JWE (encrypted) token
async function createHybridToken(payload, opts = {}) {
  // Create signed token (JWS) using HMAC (HS256)
  const alg = 'HS256'
  const jws = await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn || '7d')
    .setIssuer('pwn-api')
    .setAudience('pwn-web')
    .setProtectedHeader({ alg, typ: 'JWT' })
    .sign(new TextEncoder().encode(SIGN_SECRET))

  // Now encrypt the compact JWS using direct symmetric key (dir) + A256GCM
  // Use provided base64 key or derive one from SIGN_SECRET for dev fallback
  let encKeyBytes
  if (ENC_KEY_BASE64) {
    encKeyBytes = Uint8Array.from(Buffer.from(ENC_KEY_BASE64, 'base64'))
  } else {
    // Derive a 32-byte key from SIGN_SECRET (not secure for prod)
    const buf = new TextEncoder().encode(SIGN_SECRET)
    encKeyBytes = new Uint8Array(32)
    encKeyBytes.set(buf.subarray(0, 32))
  }

  const jwk = {
    kty: 'oct',
    k: Buffer.from(encKeyBytes).toString('base64url')
  }

  const key = await importJWK(jwk, 'A256GCM')

  const jwe = await new CompactEncrypt(new TextEncoder().encode(jws))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(key)

  return jwe
}

// Verify hybrid token: decrypt JWE then verify JWS
async function verifyHybridToken(token) {
  // import the same symmetric JWK used to encrypt
  let encKeyBytes
  if (ENC_KEY_BASE64) {
    encKeyBytes = Uint8Array.from(Buffer.from(ENC_KEY_BASE64, 'base64'))
  } else {
    const buf = new TextEncoder().encode(SIGN_SECRET)
    encKeyBytes = new Uint8Array(32)
    encKeyBytes.set(buf.subarray(0, 32))
  }
  const jwk = { kty: 'oct', k: Buffer.from(encKeyBytes).toString('base64url') }
  const key = await importJWK(jwk, 'A256GCM')

  const { plaintext } = await compactDecrypt(token, key)
  const jws = new TextDecoder().decode(plaintext)

  const { payload } = await jwtVerify(jws, new TextEncoder().encode(SIGN_SECRET), {
      issuer: 'pwn-api',
      audience: 'pwn-web'
  })
  return payload
}

// Register handler
export async function register(req, res) {
  const { userName, password } = req.body || {}
  // Determine if creator is authenticated worm (allow creating worm accounts)
  let creatorIsWorm = false;
  try {
    const token = req.cookies?.auth_token || req.headers['authorization']?.replace(/^Bearer\s+/, '')
    if (token) {
      const payload = await verifyHybridToken(token).catch(() => null)
      if (payload && payload.worm) creatorIsWorm = true
    }
  } catch (e) {
    // ignore
  }
  function validatePassword(p) {
    const errors = []
    if (!p || p.length < 16) errors.push('at least 16 characters')
    const upper = (p.match(/[A-Z]/g) || []).length
    if (upper < 3) errors.push('at least 3 uppercase letters')
    const digits = (p.match(/[0-9]/g) || []).length
    if (digits < 3) errors.push('at least 3 numbers')
    const symbols = (p.match(/[^A-Za-z0-9]/g) || []).length
    if (symbols < 3) errors.push('at least 3 symbols')
    return errors
  }

  const pwdErrors = validatePassword(password)
  if (pwdErrors.length) {
    return res.status(400).json({ error: 'Password requirements: ' + pwdErrors.join(', ') })
  }
  if (!userName || !password) {
    return res.status(400).json({ error: 'userName and password required' })
  }

  try {
  const hashed = await bcrypt.hash(password, 10)
  // If creator is a worm and request asks for worm creation, allow it
  const wantWorm = !!req.body.worm
  const isWorm = creatorIsWorm && wantWorm
  const u = await User.create({ userName, pass: hashed, worm: isWorm })
    res.status(201).json({ id: u.id, userName: u.userName })
  } catch (err) {
    console.error('Register error', err)
    res.status(500).json({ error: 'Could not create user' })
  }
}

// Worm-only registration endpoint: authenticated worms can create new worm accounts
export async function registerWorm(req, res) {
  try {
    // requireAuth and verifyWorm middleware should have set req.user and ensured worm
    if (!req.user || !req.user.worm) return res.status(401).json({ error: 'Not authorized' });

    const { userName, password } = req.body || {};
    if (!userName || !password) return res.status(400).json({ error: 'userName and password required' });

    function validatePassword(p) {
      const errors = []
      if (!p || p.length < 16) errors.push('at least 16 characters')
      const upper = (p.match(/[A-Z]/g) || []).length
      if (upper < 3) errors.push('at least 3 uppercase letters')
      const digits = (p.match(/[0-9]/g) || []).length
      if (digits < 3) errors.push('at least 3 numbers')
      const symbols = (p.match(/[^A-Za-z0-9]/g) || []).length
      if (symbols < 3) errors.push('at least 3 symbols')
      return errors
    }

    const pwdErrors = validatePassword(password)
    if (pwdErrors.length) {
      return res.status(400).json({ error: 'Password requirements: ' + pwdErrors.join(', ') })
    }

    const hashed = await bcrypt.hash(password, 10)
    const u = await User.create({ userName, pass: hashed, worm: true })
    res.status(201).json({ id: u.id, userName: u.userName })
  } catch (err) {
    console.error('registerWorm error', err)
    res.status(500).json({ error: 'Could not create worm user' })
  }
}

// Login handler
export async function login(req, res) {
  const { userName, password } = req.body || {}
  if (!userName || !password) {
    return res.status(400).json({ error: 'userName and password required' })
  }

  try {
    const user = await User.findOne({ where: { userName } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.pass)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = await createHybridToken({ sub: user.id, userName: user.userName, worm: user.worm })

    // Send httpOnly secure cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({ id: user.id, userName: user.userName })
  } catch (err) {
    console.error('Login error', err)
    res.status(500).json({ error: 'Login failed' })
  }
}

export async function logout(req, res) {
  res.clearCookie('auth_token')
  res.json({ ok: true })
}

// Middleware to protect routes
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.auth_token || req.headers['authorization']?.replace(/^Bearer\s+/, '')
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const payload = await verifyHybridToken(token)
    // attach user info to request
    req.user = { id: payload.sub, userName: payload.userName, worm: payload.worm }
    next()
  } catch (err) {
    console.error('Auth verify failed', err)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export async function verifyWorm(req, res, next) {
  if (req.user.worm) {
    next()
    return

  }

  return res.status(401).json({error: 'User isn\'t a worm'})
  
}

export async function me(req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: 'not authenticated' })
    const user = await User.findByPk(req.user.id, { attributes: ['id','userName','worm','createdAt'] })
    if (!user) return res.status(404).json({ error: 'not found' })
    res.json({ user: { id: user.id, userName: user.userName, worm: user.worm, createdAt: user.createdAt } })
  } catch (err) {
    console.error('me error', err)
    res.status(500).json({ error: 'internal' })
  }
}

export { createHybridToken, verifyHybridToken }
