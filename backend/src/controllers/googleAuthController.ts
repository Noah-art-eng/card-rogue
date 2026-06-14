import bcrypt from 'bcrypt'
import { OAuth2Client } from 'google-auth-library'
import type { Request, Response } from 'express'
import crypto from 'node:crypto'

import { User } from '../models/User.js'
import { generateUniqueUsername } from '../utils/username.js'
import { signAccessToken } from '../utils/jwt.js'
import { toPublicUser } from '../utils/user.js'

const BCRYPT_SALT_ROUNDS = 10

function getGoogleClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID?.trim() || undefined
}

export async function googleLogin(req: Request, res: Response): Promise<void> {
  const clientId = getGoogleClientId()
  if (!clientId) {
    res.status(503).json({ message: 'Google login is not configured' })
    return
  }

  const credential = req.body?.credential
  if (!credential || typeof credential !== 'string') {
    res.status(400).json({ message: 'Google credential is required' })
    return
  }

  const client = new OAuth2Client(clientId)
  let payload: {
    email?: string | null
    sub?: string | null
    name?: string | null
    given_name?: string | null
    picture?: string | null
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    })
    payload = ticket.getPayload() ?? {}
  } catch {
    res.status(401).json({ message: 'Invalid Google token' })
    return
  }

  const email = payload.email?.trim().toLowerCase()
  const googleId = payload.sub?.trim()
  if (!email || !googleId) {
    res.status(401).json({ message: 'Invalid Google account payload' })
    return
  }

  const picture = payload.picture?.trim() ?? ''
  const displayName = payload.name?.trim() || payload.given_name?.trim() || email.split('@')[0]

  let user = await User.findOne({ googleId })
  if (!user) {
    user = await User.findOne({ email })
  }

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId
    }
    if (!user.avatar && picture) {
      user.avatar = picture
    }
    await user.save()
  } else {
    const username = await generateUniqueUsername(displayName, email)
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), BCRYPT_SALT_ROUNDS)

    user = await User.create({
      username,
      email,
      passwordHash,
      avatar: picture,
      provider: 'google',
      googleId,
    })
  }

  const token = signAccessToken({
    userId: user._id.toString(),
    username: user.username,
    email: user.email,
  })

  res.status(200).json({
    message: 'Login successful',
    token,
    user: toPublicUser(user),
  })
}
