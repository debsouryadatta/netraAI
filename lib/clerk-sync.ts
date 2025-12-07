import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

/**
 * Syncs a Clerk user to the Prisma database
 * Can be called from webhooks or on-demand
 */
export async function syncClerkUser(clerkUser: {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string | null
}) {
  if (!clerkUser.email) {
    throw new Error('User must have an email address')
  }

  const name = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || null

  // Upsert user - create if doesn't exist, update if it does
  const user = await prisma.user.upsert({
    where: { clerkId: clerkUser.id } as unknown as Prisma.UserWhereUniqueInput,
    update: {
      email: clerkUser.email,
      name,
      imageUrl: clerkUser.imageUrl || null,
    } as unknown as Prisma.UserUpdateInput,
    create: {
      clerkId: clerkUser.id,
      email: clerkUser.email,
      name,
      imageUrl: clerkUser.imageUrl || null,
    } as unknown as Prisma.UserCreateInput,
  })

  return user
}

