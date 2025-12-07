import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * GET /api/chat/conversations
 * Fetches all conversations for the authenticated user
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database (should be synced via webhook)
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found. Please sign in again.' },
        { status: 404 }
      )
    }

    // Fetch all conversations for the user, ordered by most recent first
    const conversations = await prisma.conversation.findMany({
      where: { userId: dbUser.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get only the last message for preview
        },
        _count: {
          select: { messages: true },
        },
      },
    })

    return NextResponse.json({
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title || 'New Conversation',
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        lastMessage: conv.messages[0]
          ? {
              content: conv.messages[0].content.substring(0, 100),
              role: conv.messages[0].role,
              createdAt: conv.messages[0].createdAt,
            }
          : null,
        messageCount: conv._count.messages,
      })),
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

