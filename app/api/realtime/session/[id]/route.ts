import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { endRealtimeSession } from '@/lib/realtime-service'
import { NextResponse } from 'next/server'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15+
    const { id } = await params

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const session = await prisma.realtimeSession.findUnique({
      where: { id },
    })

    if (!session || session.userId !== dbUser.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // End Google Realtime API session if token exists
    if (session.transcript) {
      try {
        await endRealtimeSession(session.transcript)
      } catch (error) {
        console.error('Error ending Realtime API session:', error)
        // Continue even if Realtime API fails
      }
    }

    // Calculate duration
    const duration = Math.floor(
      (new Date().getTime() - session.createdAt.getTime()) / 1000
    )

    // Update session with duration
    await prisma.realtimeSession.update({
      where: { id },
      data: {
        duration,
        // transcript will contain the final transcript if available
      },
    })

    return NextResponse.json({ success: true, duration })
  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    )
  }
}

