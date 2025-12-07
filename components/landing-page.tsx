"use client"

import { SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bot, Zap, Eye, MessageSquare, Sparkles, Languages, Mic } from "lucide-react"

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Netra AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </SignInButton>
            <SignInButton mode="modal">
              <Button size="sm">Get Started</Button>
            </SignInButton>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32 lg:pb-40">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div className="relative z-10 text-center lg:text-left">
                <div className="mb-8 flex justify-center lg:justify-start">
                  <div className="inline-flex items-center rounded-full border bg-background/50 px-3 py-1 text-sm text-muted-foreground backdrop-blur-sm">
                    <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                    Now with Regional Language Support
                  </div>
                </div>
                <h1 className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl md:text-7xl lg:text-8xl mb-6">
                  Learn locally, <br />
                  <span className="text-primary">Think globally.</span>
                </h1>
                <p className="mx-auto lg:mx-0 mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
                  Start your learning journey in <span className="font-semibold text-foreground">Kannada</span>.
                  Netra AI breaks down language barriers, making complex topics easy to understand in your mother tongue.
                </p>
                <div className="mt-10 flex flex-col items-center lg:items-start justify-center lg:justify-start gap-4 sm:flex-row">
                  <SignInButton mode="modal">
                    <Button size="lg" className="h-12 px-8 text-base">
                      Start Learning Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </SignInButton>
                  <a 
                    href="#features" 
                    className="inline-flex h-12 items-center justify-center rounded-md px-8 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Explore Features
                  </a>
                </div>
              </div>

              {/* Visual Content - The "Scripture" / Artistic Element */}
              <div className="relative flex items-center justify-center lg:justify-end mt-12 lg:mt-0">
                {/* Decorative glowing background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-50" />
                
                {/* The 'Scripture' element - Large stylized Kannada character */}
                <div className="relative z-10 w-full max-w-md">
                   <div className="relative aspect-square rounded-3xl border bg-background/50 backdrop-blur-xl p-8 shadow-2xl overflow-hidden">
                      {/* Artistic 'Aa' */}
                      <div className="absolute -right-10 -bottom-10 text-[300px] font-serif text-primary/5 select-none pointer-events-none leading-none">
                        ಅ
                      </div>
                      
                      {/* Chat Interface Mockup */}
                      <div className="flex flex-col gap-4 h-full">
                        <div className="flex items-center gap-3 border-b pb-4">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          <div className="h-3 w-3 rounded-full bg-yellow-500" />
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <span className="ml-2 text-xs text-muted-foreground font-mono">netra-ai-chat.ts</span>
                        </div>

                        <div className="flex-1 space-y-4">
                           {/* User Message */}
                           <div className="flex justify-end">
                             <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm">
                               Explain Photosynthesis simply
                             </div>
                           </div>

                           {/* AI Response in Kannada */}
                           <div className="flex justify-start">
                             <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] text-sm relative overflow-hidden">
                               <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
                               <p className="font-medium text-foreground mb-1 text-xs uppercase tracking-wider opacity-70">Translation</p>
                               <p className="text-foreground/90 leading-relaxed font-serif">
                                 ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆ (Photosynthesis) ಎಂದರೆ ಸಸ್ಯಗಳು ಸೂರ್ಯನ ಬೆಳಕನ್ನು ಬಳಸಿ ತಮ್ಮ ಆಹಾರವನ್ನು ತಯಾರಿಸುವ ಪ್ರಕ್ರಿಯೆ.
                               </p>
                               <div className="mt-2 flex gap-2">
                                  <span className="inline-flex items-center rounded-full bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground border">
                                    <Mic className="mr-1 h-3 w-3" /> Listen
                                  </span>
                               </div>
                             </div>
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative border-t bg-muted/30 py-24 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Global Tech, Local Heart
              </h2>
              <p className="mt-4 text-muted-foreground">
                We combine state-of-the-art AI with deep understanding of regional context.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="group relative rounded-2xl border bg-background p-8 transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300">
                  <Languages className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Kannada First</h3>
                <p className="text-muted-foreground">
                  Ask in English, get answers in Kannada, or vice versa. Perfect for bridging the language gap in education.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group relative rounded-2xl border bg-background p-8 transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  <Eye className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Visual Learning</h3>
                <p className="text-muted-foreground">
                  Point your camera at any textbook or diagram. Netra will analyze and explain it to you instantly.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group relative rounded-2xl border bg-background p-8 transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Smart Context</h3>
                <p className="text-muted-foreground">
                  The AI understands nuances and local references, making learning feel like chatting with a wise tutor.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold">Netra AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Netra AI. Made with ❤️ in India.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
