import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { initializeRealtimeSession } from '@/lib/realtime-service'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await req.json()

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create database session record
    const session = await prisma.realtimeSession.create({
      data: {
        userId: dbUser.id,
        type: type || 'audio',
      },
    })

    // Initialize Google Live API session configuration
    try {
      const liveSessionConfig = await initializeRealtimeSession({
        sessionId: session.id,
        type: type || 'audio',
      })

      // Return session configuration for client-side WebSocket connection
      // The client will use this config to establish WebSocket connection:
      // ai.live.connect({ model, config, callbacks: {...} })
      return NextResponse.json({
        sessionId: session.id,
        type: session.type,
        model: liveSessionConfig.model,
        config: liveSessionConfig.config,
        createdAt: session.createdAt,
        // Note: Client should establish WebSocket connection using @google/genai SDK
        // Example: const session = await ai.live.connect({ model, config, callbacks })
      })
    } catch (realtimeError) {
      // If Live API fails, still return the database session
      console.error('Google Live API error:', realtimeError)
      return NextResponse.json({
        sessionId: session.id,
        type: session.type,
        error: 'Live API initialization failed, but session created',
        createdAt: session.createdAt,
      })
    }
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

