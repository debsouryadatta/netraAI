import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { generateAIResponse } from '@/lib/ai-service'
import { detectLanguageRequest, type SupportedLanguage } from '@/lib/language-detector'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId, message, currentLanguage } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Detect language change request from user message
    const detectedLanguage = detectLanguageRequest(message)
    const language: SupportedLanguage = detectedLanguage || (currentLanguage || 'kannada')

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: dbUser.id,
          title: message.substring(0, 50) || 'New Conversation',
        },
        include: {
          messages: true,
        },
      })
    }

    // Build conversation history for Gemini
    const conversationHistory = conversation.messages.map((msg: { role: 'user' | 'assistant'; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    // Generate AI response using Google Gemini 3 Pro
    const aiResponse = await generateAIResponse(
      message,
      conversation.id,
      conversationHistory,
      language
    )

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse,
      },
    })

    // Update conversation timestamp and title if it's still default
    const updateData: { updatedAt: Date; title?: string } = {
      updatedAt: new Date(),
    }
    
    // Update title if it's still "New Conversation" or empty/null
    if (!conversation.title || conversation.title === 'New Conversation') {
      // Use first user message as title (truncated to 50 chars)
      updateData.title = message.substring(0, 50).trim() || 'New Conversation'
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: updateData,
    })

    return NextResponse.json({
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
      },
      language, // Return current language so client can update
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

