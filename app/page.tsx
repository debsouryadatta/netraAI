"use client"

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChatMode } from '@/components/chat-mode'
import { RealtimeMode } from '@/components/realtime-mode'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Netra AI</h1>
              <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">
                konnect and learn
              </p>
            </div>
            <p className="text-lg text-muted-foreground">
              Learn any subject with AI assistance
            </p>
            <SignInButton mode="modal">
              <Button size="lg">Sign In to Continue</Button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex h-screen flex-col">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between px-4">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-xl font-semibold">Netra AI</h1>
                <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                  konnect and learn
                </p>
              </div>
              <UserButton />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            <Tabs defaultValue="realtime" className="flex h-full flex-col">
              <div className="border-b px-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="realtime">Realtime</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="realtime" className="flex-1 overflow-hidden">
                <RealtimeMode />
              </TabsContent>

              <TabsContent value="chat" className="flex-1 overflow-hidden">
                <ChatMode />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </SignedIn>
    </div>
  )
}
