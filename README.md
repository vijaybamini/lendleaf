# LendLeaf

LendLeaf is a community book-sharing platform for readers who want to lend and borrow physical books. Members can build a personal shelf, discover nearby books, send borrow requests, coordinate handovers, and talk with other readers through posts and direct messages.

## What It Does

- Create an account with email/password or Google OAuth.
- Add books to your shelf by searching Open Library for a title, author, or ISBN.
- Browse the shared library and request available books from other members.
- Use Leaf Credits to keep lending reciprocal: borrowing costs 1 credit, lending earns 1 credit after handover.
- Confirm physical handover and return from both sides so book and credit state stay accurate.
- Share reading thoughts in a community feed with likes, comments, hashtags, tagged books, and image posts.
- Message other members directly, including from borrow requests and posts.
- Save an optional location to sort and filter nearby books without exposing other users' raw coordinates to the client.

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Router and TanStack React Query
- Supabase Auth, Postgres, Realtime, Storage, RLS, and RPC functions
- Tailwind CSS 4
- Radix UI primitives and shadcn-style components
- Lucide React icons
- Cloudflare Workers deployment through Wrangler
- Open Library API for book search and cover metadata

## Project Structure

```text
src/
  components/              Shared app and UI components
  components/headers/      Route-specific mobile/desktop headers
  hooks/                   Credits, location, theme, and responsive hooks
  integrations/supabase/   Supabase client and generated database types
  lib/                     Auth provider, API helpers, theme utilities
  routes/                  File-based TanStack Router pages
supabase/
  migrations/              Database schema, RLS policies, RPCs, storage setup
```

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page for guests, community feed for signed-in users |
| `/signup` | Create an account |
| `/login` | Sign in |
| `/browse` | Browse available, nearby, or all books |
| `/search` | Search entry point for books |
| `/profile` | View your profile and manage your shelf |
| `/requests` | Manage incoming and sent borrow requests |
| `/messages` | Direct messages between members |
| `/posts` | Community posts and compose flow |

## Borrowing Flow

1. A member adds books to their shelf.
2. Another member browses books and sends a borrow request.
3. The lender accepts or declines the request.
4. If accepted, both lender and borrower confirm the physical handover.
5. Once both confirm, the transaction becomes active, the book is marked as lent, and 1 Leaf Credit moves from borrower to lender.
6. When the book is returned, both sides confirm the return.
7. After both return confirmations, the transaction is completed and the book becomes available again.

## Database Overview

The Supabase migrations define the main backend surface:

- `profiles`: user display name, credits, avatar/profile metadata, and optional location fields.
- `books`: physical books owned by users, including title, author, ISBN, cover image, external Open Library ID, and availability status.
- `transactions`: borrow requests and loan state between borrowers and lenders.
- `posts`, `post_likes`, `post_comments`: community feed content and engagement.
- `messages`: direct messages with realtime updates and read state.
- `post-images` storage bucket: public image uploads for community posts.

Important RPC functions include:

- `request_borrow(book_id)`
- `respond_to_request(transaction_id, accept)`
- `confirm_handover(transaction_id)`
- `confirm_return(transaction_id)`
- `cancel_borrow_request(book_id)`
- `nearby_book_distances(lat, lng)`
- `get_my_location()`

## Environment Variables

Create a `.env` file in the project root with your Supabase project values:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
```

The client also accepts these fallback names when needed:

```env
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_ANON_KEY=
```

For Google sign-in, enable the Google provider in Supabase Auth and add the app URL to the allowed redirect URLs. The app redirects OAuth users to `/browse`.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Lint the project:

```bash
npm run lint
```

Format files:

```bash
npm run format
```

## Supabase Setup

This project expects the migrations in `supabase/migrations` to be applied to a Supabase project. They create tables, indexes, row-level security policies, storage policies, realtime settings, and the RPC functions used by the app.

If you are using the Supabase CLI, link your project and push the migrations:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Make sure Supabase Realtime is available for the `messages` table and the `post-images` storage bucket exists. The migrations include the required setup.

## Deployment

The app is configured for Cloudflare Workers through `wrangler.jsonc`.

```bash
npm run deploy
```

This runs a production build and deploys with Wrangler.

## Notes

- Book metadata comes from Open Library and does not require an API key.
- Location support uses browser geolocation and OpenStreetMap Nominatim reverse geocoding.
- Nearby distance calculation runs through a Supabase RPC so other members' coordinates are not sent directly to the browser.
- Row-level security is enabled across the core Supabase tables.
