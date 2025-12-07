# Setup Guide - Kannada AI Guru

## Quick Start Checklist

- [ ] Install dependencies: `pnpm install`
- [ ] Set up PostgreSQL database
- [ ] Configure `.env` file with all required keys
- [ ] Run database migrations: `pnpm db:migrate`
- [ ] Set up Clerk webhook endpoint
- [ ] Get Google Gemini API key
- [ ] Get Google Realtime API key
- [ ] Start dev server: `pnpm dev`

## Environment Variables Required

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/netraai?schema=public"

# Clerk (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Google APIs (get from https://makersuite.google.com/app/apikey)
# Note: Realtime API uses the same API key as Gemini API
GOOGLE_GEMINI_API_KEY="your-api-key"
# Optional: Only set this if you have a separate Realtime API key
# GOOGLE_REALTIME_API_KEY="your-realtime-api-key"
```

## Important Notes

1. **Google Realtime API**: The Realtime API endpoints in `lib/realtime-service.ts` may need adjustment based on the actual Google Realtime API documentation. Please verify the endpoints match the official API.

2. **Gemini Model**: Currently using `gemini-1.5-pro`. When Gemini 3 Pro becomes available, update the model name in `lib/ai-service.ts`.

3. **Session Token Storage**: The Realtime API session token is temporarily stored in the `transcript` field of the database. Consider adding a dedicated `sessionToken` field in the schema if needed for production.

4. **Audio Processing**: The real-time audio processing requires proper client-side implementation to capture and send audio streams. The current implementation provides the backend infrastructure.

## Testing

1. Sign up/login with Clerk
2. Test chat mode by sending a message
3. Test realtime mode by starting a session
4. Verify data is being saved to the database

## Troubleshooting

- **Database errors**: Ensure PostgreSQL is running and DATABASE_URL is correct
- **Clerk errors**: Verify all Clerk keys are set correctly
- **Gemini errors**: Check API key and quota limits
- **Realtime errors**: Verify API key and endpoint URLs

