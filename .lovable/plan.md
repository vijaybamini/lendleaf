

## Show all available books on the Browse page

Right now, `/browse` only lists books from other members and silently includes any book regardless of whether it's already lent out. I'll turn it into a true catalog of everything on LendLeaf.

### What changes for the user

- **Browse shows the full library.** Every book any member has added to LendLeaf appears on the Browse page, not just books from other people.
- **Your own books are shown but clearly marked.** Books you own get a small "Your book" badge and an outlined, disabled action — no Borrow button, no self-borrowing.
- **Books currently lent out are visible but marked unavailable.** They show a "Currently lent" badge with a disabled button so members can still discover titles that exist on the platform.
- **Borrowable books work as today.** "Request to Borrow" stays gated by Leaf Credits, with the existing tooltip when credits are 0, and "Request sent" state after requesting.
- **Result count + filter.** Above the grid: "Showing N books" plus a simple toggle — *All books* / *Available to borrow* / *My books* — defaulting to *All books* so opening Browse always shows everything.

### Technical plan

File: `src/routes/browse.tsx` (only file changed)

1. **Query change**: drop the `.neq("owner_id", user.id)` filter. Select all books and also include `status` in the columns. Keep ordering by `created_at desc`.
2. **State**: add `filter: "all" | "available" | "mine"` (default `"all"`). Derive `visibleBooks` from `books` based on filter.
3. **Card rendering**: per book, compute:
   - `isMine = book.owner_id === user.id`
   - `isLent = book.status !== "available"`
   - `requested = requestedBookIds.has(book.id)`
   - Owner label: "You" if mine, else the profile display name (existing `owners` map).
4. **Action button logic** (priority order):
   - `isMine` → outlined disabled button "Your book".
   - `isLent` → outlined disabled button "Currently lent".
   - `requested` → existing "Request sent" state.
   - `noCredits` → existing tooltip + disabled button.
   - else → existing "Request to Borrow" calling `request_borrow` RPC.
5. **Header area**: keep title, credits pill, and no-credits notice. Add a small segmented control (3 buttons) for the filter and a "Showing N of M" line.
6. **Empty states**: keep current empty illustration; adjust copy when a filter yields zero results (e.g., "No books match this filter").

No database, RLS, or RPC changes are required — `books` already has a public SELECT policy and `request_borrow` already rejects self-borrows and unavailable books, so the UI guards are purely cosmetic safety on top of existing server enforcement.

