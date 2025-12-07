"use client"

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Send, Mic, History, Plus, MessageSquare, Image as ImageIcon, X, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { detectLanguageRequest, type SupportedLanguage, languageNames, languageNativeNames } from '@/lib/language-detector'

interface FileAttachment {
  file?: File // Only present for newly selected files
  preview: string
  type: 'image' | 'file'
  name?: string
  size?: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  attachments?: FileAttachment[]
}

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessage: {
    content: string
    role: string
    createdAt: string
  } | null
  messageCount: number
}

export function ChatMode() {
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('kannada')
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Load conversation history on mount
    loadConversation()
    loadConversations()
  }, [])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      // Cleanup will happen when component unmounts
      // URLs are already cleaned up when files are removed or messages are sent
    }
  }, [])

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true)
      const response = await fetch('/api/chat/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const loadConversation = async (id?: string) => {
    try {
      const url = id
        ? `/api/chat/conversation?conversationId=${id}`
        : '/api/chat/conversation'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (data.conversation) {
          setConversationId(data.conversation.id)
          setMessages(
            data.messages.map((msg: any) => ({
              ...msg,
              createdAt: new Date(msg.createdAt),
            }))
          )
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  const handleConversationSelect = async (id: string) => {
    await loadConversation(id)
    setIsHistoryOpen(false)
  }

  const handleNewConversation = async () => {
    try {
      const response = await fetch('/api/chat/conversation', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.conversation) {
          setConversationId(data.conversation.id)
          setMessages([])
          setCurrentLanguage('kannada') // Reset to default language
          setIsHistoryOpen(false)
          await loadConversations() // Refresh conversation list
        }
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newAttachments: FileAttachment[] = files.map((file) => {
      const isImage = file.type.startsWith('image/')
      return {
        file,
        preview: isImage ? URL.createObjectURL(file) : '',
        type: isImage ? 'image' : 'file',
        name: file.name,
        size: file.size,
      }
    })
    setSelectedFiles((prev) => [...prev, ...newAttachments])
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      // Revoke object URL to prevent memory leak
      if (prev[index].preview) {
        URL.revokeObjectURL(prev[index].preview)
      }
      return updated
    })
  }

  const sendMessage = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading) return

    const userMessageText = input.trim()
    
    // Detect language change request
    const detectedLanguage = detectLanguageRequest(userMessageText)
    if (detectedLanguage && detectedLanguage !== currentLanguage) {
      setCurrentLanguage(detectedLanguage)
    }

    // Create attachments for display (without File objects for serialization)
    const displayAttachments: FileAttachment[] = selectedFiles.map((attachment) => ({
      preview: attachment.preview,
      type: attachment.type,
      name: attachment.name,
      size: attachment.size,
    }))

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageText || (selectedFiles.length > 0 ? 'Sent an image/file' : ''),
      createdAt: new Date(),
      attachments: displayAttachments,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    const filesToSend = [...selectedFiles]
    setSelectedFiles([])
    setIsLoading(true)

    try {
      // Create FormData to send files
      const formData = new FormData()
      formData.append('conversationId', conversationId || '')
      formData.append('message', userMessageText)
      formData.append('currentLanguage', detectedLanguage || currentLanguage)
      
      // Append all files
      filesToSend.forEach((attachment, index) => {
        formData.append(`file_${index}`, attachment.file)
      })
      formData.append('fileCount', filesToSend.length.toString())

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      // Update language if changed
      if (data.language && data.language !== currentLanguage) {
        setCurrentLanguage(data.language)
      }

      const assistantMessage: Message = {
        id: data.message.id,
        role: 'assistant',
        content: data.message.content,
        createdAt: new Date(data.message.createdAt),
      }

      setMessages((prev) => [...prev, assistantMessage])
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId)
      }
      // Refresh conversation list after sending message
      await loadConversations()
      
      // Clean up object URLs
      filesToSend.forEach((attachment) => {
        if (attachment.preview) {
          URL.revokeObjectURL(attachment.preview)
        }
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages((prev) => prev.slice(0, -1)) // Remove user message on error
      // Restore files on error
      setSelectedFiles(filesToSend)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with History Button */}
      <div className="flex-shrink-0 border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h2 className="text-lg font-semibold">Netra AI</h2>
          <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                Chat History
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Chat History</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleNewConversation}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Conversation
                </Button>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {isLoadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground">Loading...</div>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No conversations yet. Start a new chat!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 pr-4">
                      {conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => handleConversationSelect(conv.id)}
                          className={cn(
                            'w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                            conversationId === conv.id && 'bg-accent'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium text-sm">
                                {conv.title || 'New Conversation'}
                              </p>
                              {conv.lastMessage && (
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {conv.lastMessage.content}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conv.updatedAt), {
                                  addSuffix: true,
                                })}
                                {' · '}
                                {conv.messageCount} message
                                {conv.messageCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h2 className="mb-2 text-2xl font-semibold">Netra AI</h2>
              <p className="text-muted-foreground">
                {currentLanguage === 'kannada'
                  ? 'ನಮಸ್ಕಾರ! ನಾನು ನೇತ್ರ AI. ನಾನು ನಿಮಗೆ ಸರಳ ಕನ್ನಡದಲ್ಲಿ ಯಾವುದೇ ವಿಷಯವನ್ನು ಕಲಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.'
                  : `Hello! I am Netra AI. I help you learn any subject in simple ${languageNames[currentLanguage]}.`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {currentLanguage === 'kannada'
                  ? 'ಭಾಷೆ ಬದಲಾಯಿಸಲು, "speak in english" ಅಥವಾ "hindi ಮಾತನಾಡಿ" ಎಂದು ಹೇಳಿ'
                  : `To change language, say "speak in kannada" or "ಕನ್ನಡ ಮಾತನಾಡಿ"`}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {currentLanguage === 'kannada' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInput('ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಎಂದರೇನು?')}
                    >
                      ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಎಂದರೇನು?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInput('ಭಾರತದ ಆರ್ಥಿಕತೆ')}
                    >
                      ಭಾರತದ ಆರ್ಥಿಕತೆ
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(`Explain quantum computing in ${languageNames[currentLanguage]}`)}
                  >
                    Sample Question
                  </Button>
                )}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {message.attachments && message.attachments.length > 0 && (
                  <div className={cn(
                    'mb-2 flex flex-wrap gap-2',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}>
                    {message.attachments.map((attachment, idx) => (
                      <div key={idx} className="relative">
                        {attachment.type === 'image' ? (
                          <img
                            src={attachment.preview}
                            alt={`Attachment ${idx + 1}`}
                            className="max-h-48 max-w-xs rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
                            <File className="h-4 w-4" />
                            <span className="text-xs truncate max-w-[200px]">
                              {attachment.name || `File ${idx + 1}`}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {message.content && (
                  <p className={cn(
                    'text-sm whitespace-pre-wrap',
                    message.role === 'user' ? 'text-primary-foreground' : ''
                  )}>
                    {message.content}
                  </p>
                )}
              </div>

              {message.role === 'user' && user && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.imageUrl} />
                  <AvatarFallback>
                    {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0]}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-foreground" />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t bg-background p-4">
        <div className="mx-auto max-w-3xl">
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedFiles.map((attachment, index) => (
                <div key={index} className="relative">
                  {attachment.type === 'image' ? (
                    <div className="relative">
                      <img
                        src={attachment.preview}
                        alt={`Preview ${index + 1}`}
                        className="h-20 w-20 rounded-lg object-cover border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -right-2 -top-2 h-5 w-5 rounded-full"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative flex items-center gap-2 rounded-lg border bg-muted p-2 pr-8">
                      <File className="h-4 w-4" />
                      <span className="text-xs truncate max-w-[150px]">
                        {attachment.name || 'Unknown file'}
                      </span>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 h-5 w-5 rounded-full"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedFiles.length > 0 ? "Ask about the image..." : "Ask your question or upload an image..."}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Voice input functionality can be added here
                console.log('Voice input')
              }}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || (!input.trim() && selectedFiles.length === 0)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

