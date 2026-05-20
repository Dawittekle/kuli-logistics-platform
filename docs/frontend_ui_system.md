# Frontend UI System

This file keeps KULI's mobile and admin interfaces visually and behaviorally consistent while frontend phases replace the current foundations with production workflows.

Related documents:
- [Frontend Architecture](frontend_architecture.md)
- [Frontend Progress](frontend_progress.md)
- [Feature Specifications](feature_specifications.md)
- [Testing Strategy](testing_strategy.md)

## Product UX Direction

KULI should feel like a calm operations tool for a city logistics marketplace, not a generic app template or marketing surface. The visual direction is:

- Sturdy and trustworthy: document verification, role clarity, account status, and route ownership are always visible.
- Fast under pressure: assisted booking and owner offer screens prioritize scan speed and short decision paths.
- Transparent for clients: booking, estimate, driver/vehicle trust, and progress states are visible before the user commits.
- Respectful of weak connectivity: forms preserve state, errors are recoverable, and pending states do not imply success.

## Reference Lessons

Comparable platforms reinforce these patterns:

- GoShare emphasizes upfront estimates, vetted providers, real-time status, driver communication, and pay/tip/review in one app flow.
- Lalamove positions delivery as fast, simple, affordable, and broad across user/driver roles.
- Uber Freight highlights instant quotes, tendering/booking, dashboard visibility, and end-to-end load status tracking.

KULI should borrow the workflow clarity, not their brand styling.

## Visual System

Use a restrained industrial palette:

- Deep teal for primary structure and authenticated shells.
- Warm ivory surfaces for forms and tables.
- Amber only for attention or pending states.
- Green for approved, completed, online, and ready.
- Red for rejected, blocked, cancelled, and destructive actions.
- Muted blue-gray for secondary metadata.

Rules:

- Border radius stays at 8px or below.
- Avoid nested cards. Use panels for top-level regions and rows/tables for repeated data.
- No decorative blobs, heavy gradients, or landing-page hero sections.
- Icons should support actions and statuses, especially in admin navigation and command buttons.
- Typography should be compact in operational areas. Large type is reserved for auth and empty-state orientation only.

## Mobile Patterns

- Auth screens use a clear role selector for public roles only: client and truck owner.
- After login, mobile must call `/me`; it never routes by a locally selected role.
- Staff roles on mobile show a forbidden state and direct the user to the admin dashboard.
- Truck owner home prioritizes vehicle verification and availability state.
- Client home prioritizes active request visibility before new-request creation.
- Touch targets must be at least 44px high.
- Buttons should not resize when loading; label changes must fit the same surface.

## Admin Patterns

- Admin and assistant share the same shell, but navigation changes by backend role.
- Admin-only actions never appear to assistants.
- Tables keep critical columns visible: name, role/status, contact, last update, action.
- Detail and decision forms should live beside tables or in a focused panel, not buried below unrelated metrics.
- Staff workflows should use concise labels and dense rows because assistants may be on live calls.

## Form Behavior

- Required fields are visually explicit.
- Backend validation errors appear next to the relevant field when possible.
- General auth/API errors appear in a dedicated alert region.
- Disabled submit means local invalid or in-flight only; server errors remain recoverable.
- Public registration never offers admin or assistant as choices.

## State Components

Every phase should reuse the same concepts:

- `ready`: green status.
- `pending`: amber status.
- `blocked`: red status.
- `muted`: explanatory secondary text.
- `empty`: plain panel with next action.
- `forbidden`: high-contrast panel explaining role mismatch.

## Phase 1 Consistency Checklist

- [x] Mobile and admin use the same role labels.
- [x] Mobile and admin use the same status colors.
- [x] Public registration shows only client and truck owner.
- [x] Admin login has no public registration affordance.
- [x] Route decisions come from backend `/me`.
- [x] Account status is visible on authenticated home surfaces.

## Phase 2 Consistency Checklist

- [x] Vehicle verification and availability use separate visible statuses.
- [x] Unapproved vehicles show an approval-required availability action.
- [x] Admin document review uses dense queue/detail layout.
- [x] Rejection decisions require a visible reason before submit.
- [x] Owner document fields keep metadata visible and retryable.

## Phase 3 Consistency Checklist

- [x] Client quote flow keeps route, load, vehicle class, and estimate in one scan path.
- [x] Manual coordinate entry uses compact paired fields and preserves form state after errors.
- [x] Quote totals show the active pricing rule version and line-item breakdown.
- [x] Nearby candidates use the same ready/pending status colors and show distance, rating, capacity, and match score.
- [x] No-result quote state suggests alternate class or wider pickup area without implying a booking was created.
- [x] Admin pricing management uses the existing dense operations panel style and version/activation language.
