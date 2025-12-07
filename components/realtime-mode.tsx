"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Mic, MicOff, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GoogleGenAI, Modality } from '@google/genai'
import { detectLanguageRequest, getSystemInstruction, type SupportedLanguage, languageNames, languageNativeNames } from '@/lib/language-detector'

export function RealtimeMode() {
  const [isRecording, setIsRecording] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string>('')
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('kannada')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [imageDescription, setImageDescription] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
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
      stopCamera()
    }
  }, [])

  // Effect to ensure video element gets the stream when cameraStream changes
  useEffect(() => {
    if (cameraStream && videoRef.current && cameraStreamRef.current) {
      // Ensure video element has the stream
      if (videoRef.current.srcObject !== cameraStreamRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current
      }
      
      // Ensure video plays
      if (videoRef.current.paused) {
        videoRef.current.play().catch((error) => {
          console.error('Error playing video in useEffect:', error)
        })
      }
    }
  }, [cameraStream])

  // Handle language change in realtime session
  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    console.log(`Language change detected: ${currentLanguage} -> ${newLanguage}`)
    setCurrentLanguage(newLanguage)
    
    // Update system instruction by sending a text message to the session
    if (liveSessionRef.current) {
      try {
        const languageName = languageNames[newLanguage]
        const nativeName = languageNativeNames[newLanguage]
        
        // Send instruction to switch language
        liveSessionRef.current.sendRealtimeInput({
          text: `Please switch to ${languageName} (${nativeName}) language. From now on, respond only in ${languageName}.`,
        })
        console.log(`Language switched to ${newLanguage}`)
      } catch (error) {
        console.error('Error updating language:', error)
      }
    }
  }

  const startSession = async () => {
    try {
      // Request media permissions (audio only, no video streaming)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false, // Disable video streaming
      })

      streamRef.current = stream

      // Don't set video stream here - camera is handled separately

      // Create session in backend to get config (audio only)
      const response = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'audio', // Always audio only, no video streaming
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

      // Connect to Live API with current language
      const systemInstruction = getSystemInstruction(currentLanguage)
      const liveSession = await ai.live.connect({
        model: config.model || data.model || 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            console.log('Connected to Gemini Live API')
            setIsRecording(true)
          },
          onmessage: (message: any) => {
            console.log('Live API message received:', message)
            
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
                  
                  // Check for language change request in the transcript
                  const detectedLanguage = detectLanguageRequest(newTranscript)
                  if (detectedLanguage && detectedLanguage !== currentLanguage) {
                    handleLanguageChange(detectedLanguage)
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

    // Stop camera stream
    stopCamera()

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

  // Initialize camera for photo capture
  const initializeCamera = async () => {
    try {
      // Stop existing camera stream if any
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Try to get camera stream with flexible constraints
      let stream: MediaStream
      try {
        // First try with back camera (environment)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
      } catch (error) {
        // Fallback to any available camera
        console.log('Back camera not available, trying any camera:', error)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
      }

      cameraStreamRef.current = stream
      setCameraStream(stream)

      // Use setTimeout to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Ensure video plays
          videoRef.current.play()
            .then(() => {
              console.log('Video playback started successfully')
            })
            .catch((error) => {
              console.error('Error playing video:', error)
              // Try again after a short delay
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.play().catch((err) => {
                    console.error('Retry video play failed:', err)
                  })
                }
              }, 300)
            })
        } else {
          console.warn('Video ref is null, video element may not be rendered yet')
          // Retry after a delay
          setTimeout(() => {
            if (videoRef.current && stream) {
              videoRef.current.srcObject = stream
              videoRef.current.play().catch((error) => {
                console.error('Delayed video play error:', error)
              })
            }
          }, 500)
        }
      }, 100)
    } catch (error) {
      console.error('Failed to access camera:', error)
      alert('Failed to access camera. Please check permissions.')
    }
  }

  // Capture photo and get description
  const capturePhoto = async () => {
    if (!videoRef.current || !cameraStreamRef.current) {
      alert('Camera not initialized. Please enable camera first.')
      return
    }

    // Check if camera stream is still active
    const activeTracks = cameraStreamRef.current.getVideoTracks().filter(track => track.readyState === 'live')
    if (activeTracks.length === 0) {
      alert('Camera stream is not active. Please enable camera again.')
      // Try to reinitialize
      await initializeCamera()
      return
    }

    // Check if video is ready
    const video = videoRef.current
    if (video.readyState < video.HAVE_CURRENT_DATA) {
      // Wait a bit for video to be ready
      await new Promise(resolve => setTimeout(resolve, 200))
      if (video.readyState < video.HAVE_CURRENT_DATA) {
        alert('Camera is not ready. Please wait a moment and try again.')
        return
      }
    }

    // Ensure video dimensions are valid
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 200))
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        alert('Camera video is not ready. Please wait and try again.')
        return
      }
    }

    setIsCapturing(true)
    setImageDescription('')

    try {
      // Ensure video is playing
      if (video.paused) {
        await video.play()
      }

      // Wait a tiny bit to ensure frame is ready
      await new Promise(resolve => setTimeout(resolve, 100))

      // Create canvas to capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to base64
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.9)

      // Send to API for description
      const response = await fetch('/api/vision/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          currentLanguage,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get image description')
      }

      const data = await response.json()
      setImageDescription(data.description)
      setTranscript(data.description) // Also update transcript for consistency
    } catch (error) {
      console.error('Error capturing photo:', error)
      alert('Failed to capture and describe image. Please try again.')
    } finally {
      setIsCapturing(false)
    }
  }

  // Stop camera stream
  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
      setCameraStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const toggleVideo = async () => {
    // Disable video streaming - only use camera for photo capture
    if (cameraStreamRef.current) {
      stopCamera()
    } else {
      await initializeCamera()
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-6">
        {/* Instructions */}
        <div className="text-center">
          <p className="mb-2 text-lg font-medium">
            {currentLanguage === 'kannada' 
              ? 'ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ' 
              : `Ask in ${languageNames[currentLanguage]}`}
          </p>
          <p className="text-muted-foreground">
            Tap the mic and ask a question
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Current language: <span className="font-medium">{languageNativeNames[currentLanguage]} ({languageNames[currentLanguage]})</span>
            {currentLanguage !== 'kannada' && (
              <span className="ml-1">• Say "speak in kannada" to switch back</span>
            )}
          </p>
        </div>

        {/* Camera Preview / Audio Display */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-purple-500/20">
          {cameraStream && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ display: 'block' }}
              onLoadedMetadata={(e) => {
                // Ensure video plays when metadata is loaded
                const video = e.currentTarget
                console.log('Video metadata loaded:', {
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  readyState: video.readyState,
                })
                video.play().catch((error) => {
                  console.error('Error auto-playing video:', error)
                })
              }}
              onCanPlay={() => {
                // Ensure video plays when it can play
                if (videoRef.current && videoRef.current.paused) {
                  videoRef.current.play().catch((error) => {
                    console.error('Error playing video on canPlay:', error)
                  })
                }
              }}
              onError={(e) => {
                console.error('Video element error:', e)
                alert('Camera video error. Please try enabling camera again.')
              }}
            />
          )}
          {!cameraStream && (
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
              cameraStream && 'bg-primary text-primary-foreground'
            )}
            onClick={toggleVideo}
            disabled={isCapturing}
          >
            {cameraStream ? (
              <Video className="h-6 w-6" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </Button>

          {cameraStream && (
            <Button
              variant="default"
              size="icon"
              className="h-14 w-14 bg-green-500 hover:bg-green-600"
              onClick={capturePhoto}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="h-6 w-6" />
              )}
            </Button>
          )}
        </div>

        {/* Image Description Display */}
        {imageDescription && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">Object Description:</p>
            <p className="text-sm">{imageDescription}</p>
          </div>
        )}

        {/* Transcript Display */}
        {transcript && !imageDescription && (
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

