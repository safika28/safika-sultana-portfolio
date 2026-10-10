# Deployment guide

## Recommended deployment flow

1. Provision a Supabase project and create the PostgreSQL schema in `database/schema.sql`.
2. Configure environment variables for the frontend and backend.
3. Deploy the Next.js app to Vercel.
4. Deploy the NestJS app to Render.
5. Connect the backend to Supabase via environment-specific credentials.

## Required environment variables

### Frontend

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

### Backend

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- JWT_ISSUER
- JWT_AUDIENCE
