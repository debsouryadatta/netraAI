# ಕನ್ನಡ AI ಗುರು (Kannada AI Guru)

A Next.js application for learning any subject in simple Kannada with AI assistance, featuring both chat and real-time audio/video modes.

## Features

- **Chat Mode**: Text-based conversations with Google Gemini 3 Pro
- **Realtime Mode**: Audio/video interactions with Google Realtime API
- **Authentication**: Clerk-based user authentication
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Modern interface built with shadcn/ui components

## Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma
- **Authentication**: Clerk
- **AI Services**: 
  - Google Gemini 1.5 Pro (Chat)
  - Google Realtime API (Audio/Video)
- **UI Components**: shadcn/ui (Radix UI)

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Clerk account
- Google Cloud account with:
  - Gemini API access
  - Realtime API access

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/netraai?schema=public"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Google AI Services
# Note: Realtime API can use the same key as Gemini API
GOOGLE_GEMINI_API_KEY="your-api-key"
# Optional: Only set this if you have a separate Realtime API key
# GOOGLE_REALTIME_API_KEY="your-realtime-api-key"
```

### 3. Database Setup

```bash
# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Open Prisma Studio to view data
pnpm db:studio
```

### 4. Clerk Webhook Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to events: `user.created`, `user.updated`
4. Copy the signing secret to `CLERK_WEBHOOK_SECRET` in `.env`

### 5. Google API Setup

#### Gemini API:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `GOOGLE_GEMINI_API_KEY` in `.env`

#### Realtime API:
1. Enable Realtime API in [Google Cloud Console](https://console.cloud.google.com/)
2. Create credentials/API key
3. Add to `GOOGLE_REALTIME_API_KEY` in `.env`

### 6. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/              # Chat API routes
│   │   ├── realtime/           # Realtime API routes
│   │   └── webhooks/          # Clerk webhooks
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main page
├── components/
│   ├── chat-mode.tsx          # Chat interface component
│   ├── realtime-mode.tsx       # Realtime interface component
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── ai-service.ts          # Google Gemini integration
│   ├── realtime-service.ts    # Google Realtime API integration
│   ├── clerk-sync.ts          # Clerk user sync utility
│   └── prisma.ts              # Prisma client
└── prisma/
    └── schema.prisma          # Database schema
```

## API Routes

### Chat
- `GET /api/chat/conversation` - Get or create conversation
- `POST /api/chat/message` - Send message and get AI response

### Realtime
- `POST /api/realtime/session` - Create new realtime session
- `DELETE /api/realtime/session/[id]` - End session
- `POST /api/realtime/audio` - Process audio stream

## Database Schema

- **User**: Synced with Clerk authentication
- **Conversation**: Groups chat messages into threads
- **Message**: Individual messages in conversations
- **RealtimeSession**: Stores audio/video session data

## Development

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Notes

- The application uses Google Gemini 1.5 Pro for chat. Update the model name in `lib/ai-service.ts` when Gemini 3 Pro becomes available.
- Realtime API integration requires proper audio/video stream handling on the client side.
- Ensure all environment variables are set before running the application.

## License

MIT
