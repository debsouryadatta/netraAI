import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * GET /api/chat/conversation?conversationId=xxx
 * Fetches a specific conversation by ID, or the most recent one if no ID provided
 */
export async function GET(req: Request) {
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

    // Check if conversationId is provided in query params
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')

    let conversation

    if (conversationId) {
      // Fetch specific conversation
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: dbUser.id, // Ensure user owns this conversation
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
    } else {
      // Get most recent conversation
      conversation = await prisma.conversation.findFirst({
        where: { userId: dbUser.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      // Create a new conversation if none exists
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            userId: dbUser.id,
            title: 'New Conversation',
          },
          include: {
            messages: true,
          },
        })
      }
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: conversation.messages,
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/conversation
 * Creates a new conversation for the authenticated user
 */
export async function POST() {
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

    // Create a new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId: dbUser.id,
        title: 'New Conversation',
      },
      include: {
        messages: true,
      },
    })

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: conversation.messages,
    })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

