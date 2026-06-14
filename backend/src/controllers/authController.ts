import bcrypt from 'bcrypt'
import type { Request, Response } from 'express'

import { User } from '../models/User.js'
import { signAccessToken } from '../utils/jwt.js'
import { toPublicUser } from '../utils/user.js'
import { validateLoginInput } from '../validators/loginValidator.js'
import { validateRegisterInput } from '../validators/registerValidator.js'

const BCRYPT_SALT_ROUNDS = 10

export async function register(req: Request, res: Response): Promise<void> {
  const validation = validateRegisterInput(req.body)

  if (!validation.valid) {
    res.status(400).json({ message: validation.message })
    return
  }

  const { username, email, password } = validation.data

  const existingUsername = await User.findOne({ username })
  if (existingUsername) {
    res.status(409).json({ message: 'Username already exists' })
    return
  }

  const existingEmail = await User.findOne({ email })
  if (existingEmail) {
    res.status(409).json({ message: 'Email already exists' })
    return
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)

  const user = await User.create({
    username,
    email,
    passwordHash,
    provider: 'local',
  })

  res.status(201).json({
    message: 'User registered successfully',
    user: toPublicUser(user),
  })
}

export async function login(req: Request, res: Response): Promise<void> {
  const validation = validateLoginInput(req.body)

  if (!validation.valid) {
    res.status(400).json({ message: validation.message })
    return
  }

  const { email, password } = validation.data

  const user = await User.findOne({ email })
  if (!user) {
    res.status(401).json({ message: 'Invalid email or password' })
    return
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
  if (!isPasswordValid) {
    res.status(401).json({ message: 'Invalid email or password' })
    return
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
