"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GoogleGenAI, Modality } from '@google/genai'
import { detectLanguageRequest, getSystemInstruction, type SupportedLanguage } from '@/lib/language-detector'

export function RealtimeMode() {
  const [isRecording, setIsRecording] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string>('')
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('kannada')
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const liveSessionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioQueueRef = useRef<Uint8Array[]>([])
  const audioBufferQueueRef = useRef<AudioBuffer[]>([])
  const isStreamingRef = useRef<boolean>(false)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const playbackAudioContextRef = useRef<AudioContext | null>(null)
  const scheduledTimeRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  const isProcessingQueueRef = useRef<boolean>(false)
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const queueProcessingTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopSession()
    }
  }, [])

  // Track user input for language detection
  const userInputRef = useRef<string>('')

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    console.log(`Language change detected: ${currentLanguage} -> ${newLanguage}`)
    setCurrentLanguage(newLanguage)
    
    // Update system instruction by sending a text message to the session
    if (liveSessionRef.current) {
      try {
        // Send a clear instruction to switch language
        const languageNames: Record<SupportedLanguage, string> = {
          kannada: 'Kannada',
          english: 'English',
          hindi: 'Hindi',
          tamil: 'Tamil',
          telugu: 'Telugu',
          marathi: 'Marathi',
          gujarati: 'Gujarati',
          bengali: 'Bengali',
        }
        
        liveSessionRef.current.sendRealtimeInput({
          text: `Please switch to ${languageNames[newLanguage]} language. From now on, respond only in ${languageNames[newLanguage]}.`,
        })
        console.log(`Language switched to ${newLanguage}`)
      } catch (error) {
        console.error('Error updating language:', error)
      }
    }
  }

  const startSession = async () => {
    try {
      // Request media permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: isVideoEnabled,
      })

      streamRef.current = stream

      if (videoRef.current && isVideoEnabled) {
        videoRef.current.srcObject = stream
      }

      // Create session in backend to get config
      const response = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isVideoEnabled ? 'both' : 'audio',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      setSessionId(data.sessionId)

      // Get API key from backend (authenticated route)
      const configResponse = await fetch('/api/realtime/config')
      if (!configResponse.ok) {
        throw new Error('Failed to get API configuration')
      }
      const config = await configResponse.json()

      const ai = new GoogleGenAI({ apiKey: config.apiKey })

      // Connect to Live API with default Kannada instruction
      const defaultSystemInstruction = getSystemInstruction('kannada')
      const liveSession = await ai.live.connect({
        model: config.model || data.model || 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: defaultSystemInstruction,
        },
        callbacks: {
          onopen: () => {
            console.log('Connected to Gemini Live API')
            setIsRecording(true)
          },
          onmessage: (message: any) => {
            console.log('Live API message received:', message)
            
            // Check for user input (if available in message)
            if (message.userInput?.text) {
              const userText = message.userInput.text
              const languageRequest = detectLanguageRequest(userText)
              if (languageRequest && languageRequest !== currentLanguage) {
                handleLanguageChange(languageRequest)
              }
            }
            
            // Handle responses
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  // Audio response - data is already base64 encoded
                  try {
                    const base64Data = part.inlineData.data
                    // Decode base64 to binary
                    const binaryString = atob(base64Data)
                    const audioData = new Uint8Array(binaryString.length)
                    for (let i = 0; i < binaryString.length; i++) {
                      audioData[i] = binaryString.charCodeAt(i)
                    }
                    
                    // Ensure AudioContext is ready
                    if (!playbackAudioContextRef.current) {
                      setupAudioPlayback()
                    }
                    
                    // Convert to AudioBuffer and add to queue (don't schedule immediately)
                    if (playbackAudioContextRef.current) {
                      const audioBuffer = convertPCMToAudioBuffer(audioData, playbackAudioContextRef.current)
                      if (audioBuffer) {
                        // Add to buffer queue for sequential processing
                        audioBufferQueueRef.current.push(audioBuffer)
                        // Process queue asynchronously to avoid blocking
                        processAudioBufferQueue()
                      }
                    } else {
                      // Fallback: store raw data if context not ready
                      audioQueueRef.current.push(audioData)
                    }
                  } catch (error) {
                    console.error('Error processing audio data:', error)
                  }
                }
                if (part.text) {
                  // Text transcript
                  console.log('Received text:', part.text)
                  const newTranscript = (transcript ? transcript + ' ' : '') + part.text
                  setTranscript(newTranscript)
                  
                  // Check for language change request in the AI's response
                  // (Sometimes the AI might mention language changes)
                  const languageRequest = detectLanguageRequest(part.text)
                  if (languageRequest && languageRequest !== currentLanguage) {
                    handleLanguageChange(languageRequest)
                  }
                }
              }
            }
            if (message.serverContent?.interrupted) {
              // Clear audio queue on interruption
              console.log('Audio interrupted')
              audioQueueRef.current = []
              audioBufferQueueRef.current = []
              isPlayingRef.current = false
              isProcessingQueueRef.current = false
              // Clear any pending queue processing
              if (queueProcessingTimeoutRef.current !== null) {
                clearTimeout(queueProcessingTimeoutRef.current)
                queueProcessingTimeoutRef.current = null
              }
              // Stop all scheduled playback
              playbackSourcesRef.current.forEach((source) => {
                try {
                  source.stop()
                } catch (e) {
                  // Ignore errors if already stopped
                }
              })
              playbackSourcesRef.current = []
              // Reset scheduled time
              if (playbackAudioContextRef.current) {
                scheduledTimeRef.current = playbackAudioContextRef.current.currentTime
              }
            }
          },
          onerror: (error: any) => {
            console.error('Live API error:', error)
            alert('Error connecting to AI. Please try again.')
            stopSession()
          },
          onclose: (event: any) => {
            console.log('Live API closed:', event.reason)
            setIsRecording(false)
          },
        },
      })

      liveSessionRef.current = liveSession

      // Wait a bit for connection to be fully established
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Set up audio playback first
      setupAudioPlayback()

      // Set up audio streaming AFTER connection is established
      await setupAudioStreaming(stream, liveSession)

      // Process any queued audio
      setTimeout(() => processAudioQueue(), 100)

      console.log('Audio streaming started')
    } catch (error) {
      console.error('Failed to start session:', error)
      alert('Failed to access microphone/camera. Please check permissions.')
      stopSession()
    }
  }

  const setupAudioStreaming = async (stream: MediaStream, liveSession: any) => {
    try {
      // Create AudioContext for processing - match the sample rate
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      
      // Use ScriptProcessorNode for audio processing
      // Buffer size: 4096 samples = ~256ms at 16kHz (good for real-time)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      isStreamingRef.current = true

      let audioChunkCount = 0

      processor.onaudioprocess = (e) => {
        // Check if we should continue streaming
        if (!isStreamingRef.current || !liveSessionRef.current) {
          return
        }

        try {
          const inputData = e.inputBuffer.getChannelData(0)
          
          // Check if there's actual audio data (not silence)
          const hasAudio = inputData.some((sample) => Math.abs(sample) > 0.01)
          if (!hasAudio) return // Skip silent chunks
          
          // Convert Float32Array (-1 to 1) to Int16Array PCM
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            // Clamp and convert to 16-bit PCM
            const sample = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
          }

          // Convert Int16Array to Uint8Array (little-endian bytes)
          const uint8Array = new Uint8Array(pcmData.buffer)
          
          // Convert to base64 string (matching the docs format)
          let binaryString = ''
          const chunkSize = 8192 // Process in chunks to avoid stack overflow
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize)
            binaryString += String.fromCharCode.apply(null, Array.from(chunk))
          }
          const base64Audio = btoa(binaryString)

          // Send to Live API (matching the docs format exactly)
          if (liveSessionRef.current && isStreamingRef.current) {
            liveSessionRef.current.sendRealtimeInput({
              audio: {
                data: base64Audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            })
            audioChunkCount++
            if (audioChunkCount % 10 === 0) {
              console.log(`Sent ${audioChunkCount} audio chunks`)
            }
          }
        } catch (sendError) {
          console.error('Error sending audio to Live API:', sendError)
        }
      }

      // Connect audio nodes
      // Note: ScriptProcessorNode needs to be connected to work
      source.connect(processor)
      processor.connect(audioContext.destination)

      console.log('Audio streaming setup complete')
    } catch (error) {
      console.error('Error setting up audio streaming:', error)
      throw error
    }
  }

  const setupAudioPlayback = () => {
    // Create AudioContext for playback (24kHz for Live API output)
    if (!playbackAudioContextRef.current) {
      playbackAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      })
      // Resume context if suspended (browser autoplay policy)
      if (playbackAudioContextRef.current.state === 'suspended') {
        playbackAudioContextRef.current.resume()
      }
      scheduledTimeRef.current = playbackAudioContextRef.current.currentTime + 0.1
    }
  }

  const processAudioBufferQueue = () => {
    const audioContext = playbackAudioContextRef.current
    if (!audioContext || isProcessingQueueRef.current) {
      return
    }

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch((err) => {
        console.error('Failed to resume AudioContext:', err)
      })
    }

    // If queue is empty, stop processing
    if (audioBufferQueueRef.current.length === 0) {
      isProcessingQueueRef.current = false
      return
    }

    isProcessingQueueRef.current = true

    // Ensure we have a valid scheduled time before processing
    const currentTime = audioContext.currentTime
    if (scheduledTimeRef.current < currentTime) {
      scheduledTimeRef.current = currentTime + 0.05 // Small buffer to prevent scheduling in the past
    }

    // Process all available chunks in the queue, scheduling them sequentially
    // We use requestAnimationFrame to batch process without blocking
    const processChunks = () => {
      // Process up to a reasonable number of chunks per frame to avoid blocking
      let processed = 0
      const maxChunksPerFrame = 5

      while (audioBufferQueueRef.current.length > 0 && processed < maxChunksPerFrame) {
        const audioBuffer = audioBufferQueueRef.current.shift()!
        
        try {
          // Create source node
          const source = audioContext.createBufferSource()
          source.buffer = audioBuffer
          source.connect(audioContext.destination)

          // Schedule playback at the scheduled time
          const startTime = scheduledTimeRef.current
          source.start(startTime)

          // Update scheduled time for next chunk (seamless continuation)
          scheduledTimeRef.current += audioBuffer.duration

          // Track source for cleanup
          playbackSourcesRef.current.push(source)

          // Mark as playing
          isPlayingRef.current = true

          // Clean up finished sources
          source.onended = () => {
            const index = playbackSourcesRef.current.indexOf(source)
            if (index > -1) {
              playbackSourcesRef.current.splice(index, 1)
            }
          }

          processed++
        } catch (error) {
          console.error('Error scheduling audio playback:', error)
          // Continue processing even if one chunk fails
        }
      }

      // If there are more chunks, continue processing in next frame
      if (audioBufferQueueRef.current.length > 0) {
        requestAnimationFrame(processChunks)
      } else {
        isProcessingQueueRef.current = false
      }
    }

    // Start processing chunks
    requestAnimationFrame(processChunks)
  }

  const convertPCMToAudioBuffer = (audioData: Uint8Array, audioContext: AudioContext): AudioBuffer | null => {
    try {
      // Calculate number of samples (16-bit = 2 bytes per sample)
      const numSamples = Math.floor(audioData.length / 2)
      if (numSamples === 0) return null

      // Convert PCM data to AudioBuffer
      const audioBuffer = audioContext.createBuffer(1, numSamples, 24000)
      const channelData = audioBuffer.getChannelData(0)
      
      // Convert Int16 PCM (little-endian) to Float32 (-1 to 1)
      for (let i = 0; i < numSamples; i++) {
        const byte1 = audioData[i * 2]
        const byte2 = audioData[i * 2 + 1]
        // Little-endian Int16
        const sample = (byte2 << 8) | byte1
        // Convert to signed Int16, then to Float32
        const int16Sample = sample > 32767 ? sample - 65536 : sample
        channelData[i] = int16Sample / 32768.0
      }

      return audioBuffer
    } catch (error) {
      console.error('Error converting PCM to AudioBuffer:', error)
      return null
    }
  }


  // Process any queued raw audio data
  const processAudioQueue = () => {
    if (!playbackAudioContextRef.current || audioQueueRef.current.length === 0) {
      return
    }

    const audioContext = playbackAudioContextRef.current
    
    // Process all queued chunks and add to buffer queue
    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!
      const audioBuffer = convertPCMToAudioBuffer(audioData, audioContext)
      
      if (audioBuffer) {
        audioBufferQueueRef.current.push(audioBuffer)
      }
    }
    
    // Process the buffer queue
    processAudioBufferQueue()
  }

  const stopSession = async () => {
    // Stop streaming first
    isStreamingRef.current = false

    // Disconnect processor
    if (processorRef.current) {
      try {
        processorRef.current.disconnect()
      } catch (error) {
        console.error('Error disconnecting processor:', error)
      }
      processorRef.current = null
    }

    // Close Live API connection
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.close()
      } catch (error) {
        console.error('Error closing Live API session:', error)
      }
      liveSessionRef.current = null
    }

    // Stop audio context
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close()
      } catch (error) {
        console.error('Error closing audio context:', error)
      }
      audioContextRef.current = null
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Stop all scheduled playback
    playbackSourcesRef.current.forEach((source) => {
      try {
        source.stop()
      } catch (e) {
        // Ignore errors if already stopped
      }
    })
    playbackSourcesRef.current = []

    // Clear audio queue and stop playback
    audioQueueRef.current = []
    audioBufferQueueRef.current = []
    isPlayingRef.current = false
    isProcessingQueueRef.current = false
    
    // Clear any pending queue processing
    if (queueProcessingTimeoutRef.current !== null) {
      clearTimeout(queueProcessingTimeoutRef.current)
      queueProcessingTimeoutRef.current = null
    }

    // Reset scheduled time
    if (playbackAudioContextRef.current) {
      scheduledTimeRef.current = playbackAudioContextRef.current.currentTime
    }

    // Close playback audio context
    if (playbackAudioContextRef.current) {
      try {
        await playbackAudioContextRef.current.close()
      } catch (error) {
        console.error('Error closing playback audio context:', error)
      }
      playbackAudioContextRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }

    // Delete session from backend
    if (sessionId) {
      try {
        await fetch(`/api/realtime/session/${sessionId}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.error('Error deleting session:', error)
      }
    }

    setIsRecording(false)
    setSessionId(null)
    setTranscript('')
    setCurrentLanguage('kannada') // Reset to default language
  }

  const toggleVideo = async () => {
    if (isRecording) {
      // Stop current session and restart with new video state
      await stopSession()
      setIsVideoEnabled(!isVideoEnabled)
      setTimeout(() => startSession(), 100)
    } else {
      setIsVideoEnabled(!isVideoEnabled)
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-6">
        {/* Instructions */}
        <div className="text-center">
          <p className="mb-2 text-lg font-medium">
            {currentLanguage === 'kannada' ? 'Ask in Kannada' : `Ask in ${currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}`}
          </p>
          <p className="text-muted-foreground">
            Tap the mic and ask a question
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Current language: <span className="font-medium capitalize">{currentLanguage}</span>
            {currentLanguage !== 'kannada' && (
              <span className="ml-1">(Say "speak in kannada" to switch back)</span>
            )}
          </p>
        </div>

        {/* Video/Audio Display */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-purple-500/20">
          {isVideoEnabled && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}
          {!isVideoEnabled && (
            <div className="flex h-full items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20">
                <Mic className="h-12 w-12 text-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleVideo}
            className={cn(
              'h-14 w-14',
              isVideoEnabled && 'bg-primary text-primary-foreground'
            )}
          >
            {isVideoEnabled ? (
              <Video className="h-6 w-6" />
            ) : (
              <VideoOff className="h-6 w-6" />
            )}
          </Button>

          <Button
            size="icon"
            onClick={isRecording ? stopSession : startSession}
            className={cn(
              'h-16 w-16 rounded-full',
              isRecording
                ? 'bg-destructive hover:bg-destructive/90'
                : 'bg-yellow-500 hover:bg-yellow-600'
            )}
          >
            {isRecording ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={cn(
              'h-14 w-14',
              isVideoEnabled && 'bg-primary text-primary-foreground'
            )}
            onClick={toggleVideo}
          >
            {isVideoEnabled ? (
              <Camera className="h-6 w-6" />
            ) : (
              <Camera className="h-6 w-6 opacity-50" />
            )}
          </Button>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">Response:</p>
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        {/* Status */}
        {isRecording && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Recording... Speak your question in Kannada
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

