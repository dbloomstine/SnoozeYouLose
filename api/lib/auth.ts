import type { VercelRequest } from '@vercel/node'
import { verify, getTokenFromHeader } from './jwt'
import { getUserById, DbUser } from './database'

export interface AuthenticatedRequest extends VercelRequest {
  user: DbUser
}

export async function authenticateRequest(req: VercelRequest): Promise<DbUser | null> {
  const token = getTokenFromHeader(req.headers.authorization)
  if (!token) return null

  const payload = await verify(token)
  if (!payload) return null

  const user = await getUserById(payload.userId)
  return user
}
