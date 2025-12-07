/**
 * Google Gemini Live API Integration
 * For real-time audio/video interactions using WebSockets
 * Documentation: https://ai.google.dev/gemini-api/docs/live
 */

import { GoogleGenAI, Modality } from '@google/genai'

export interface RealtimeSessionConfig {
  sessionId: string
  type: 'audio' | 'video' | 'both'
}

export interface RealtimeResponse {
  transcript?: string
  audioUrl?: string
  error?: string
}

/**
 * Get the Google GenAI client instance
 */
function getGenAIClient() {
  const apiKey = process.env.GOOGLE_REALTIME_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('GOOGLE_REALTIME_API_KEY or GOOGLE_GEMINI_API_KEY must be configured')
  }

  return new GoogleGenAI({
    apiKey,
  })
}

/**
 * Initialize a Google Live API session
 * Returns session metadata for tracking (actual WebSocket connection happens client-side)
 * 
 * Note: The Live API uses WebSockets and is typically connected client-side.
 * This function provides session configuration that can be used to establish
 * the WebSocket connection from the client.
 */
export async function initializeRealtimeSession(
  config: RealtimeSessionConfig
): Promise<{ sessionId: string; model: string; config: any }> {
  const apiKey = process.env.GOOGLE_REALTIME_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('GOOGLE_REALTIME_API_KEY or GOOGLE_GEMINI_API_KEY must be configured')
  }

  try {
    // According to the official docs: https://ai.google.dev/gemini-api/docs/live
    // Model: gemini-2.5-flash-native-audio-preview-09-2025
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025'
    
    // Build config based on documentation
    // According to docs: responseModalities should be an array of modality strings
    const responseModalities: string[] = ['AUDIO']
    
    // Add video if needed (check if VIDEO modality exists)
    if (config.type === 'video' || config.type === 'both') {
      // Note: Video support may vary by model and API version
      // For now, using audio-only as per the official example
      responseModalities.push('VIDEO')
    }

    const liveConfig: any = {
      responseModalities,
      systemInstruction: 'You are a helpful AI tutor called "Netra AI" that teaches subjects in simple Kannada. Always respond in Kannada language. Be friendly, clear, and educational.',
    }

    console.log('Live API session configuration:', {
      model,
      type: config.type,
      responseModalities: liveConfig.responseModalities,
    })

    // Return session metadata
    // The actual WebSocket connection should be established client-side
    // using: ai.live.connect({ model, config, callbacks: {...} })
    return {
      sessionId: config.sessionId,
      model,
      config: liveConfig,
    }
  } catch (error) {
    console.error('Live API initialization error:', error)
    throw error
  }
}

/**
 * Process audio stream and get transcript/response
 * 
 * Note: This is a placeholder. Actual audio processing happens through
 * WebSocket streams in the Live API. This function can be used for
 * server-side processing if needed, but typically audio is streamed
 * directly from client to Google's Live API via WebSocket.
 */
export async function processRealtimeAudio(
  audioData: ArrayBuffer,
  sessionToken: string
): Promise<RealtimeResponse> {
  // Audio processing happens through WebSocket streams in Live API
  // This is a placeholder for server-side processing if needed
  console.warn('processRealtimeAudio: Audio should be streamed via WebSocket in Live API')
  return {
    error: 'Audio processing should be done via WebSocket connection to Live API',
  }
}

/**
 * End a Live API session
 * 
 * Note: Sessions are closed by closing the WebSocket connection.
 * This function is a placeholder for any cleanup needed.
 */
export async function endRealtimeSession(
  sessionToken: string
): Promise<void> {
  // Live API sessions are closed by closing the WebSocket connection
  // This is a placeholder for any server-side cleanup
  console.log('Live API session ended (WebSocket closed)')
}

