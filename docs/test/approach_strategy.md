# 4. Approach / Strategy

This section describes the overall testing approach for the KULI system. The approach is designed as an acceptance-level and project-level strategy because KULI includes a mobile app, backend API, database, Supabase authentication, and an admin web dashboard. Testing therefore combines automated checks, integration tests, and role-based manual workflow testing.

The selected strategy is risk-based. Features that can change money, request status, vehicle availability, user roles, or trust records are tested more heavily than display-only areas. The main rule is that the UI must never show success for important actions until the backend confirms the action.

## 4.1 Overall Test Strategy

KULI was tested using the following layered strategy:

| Test level | Purpose | Main focus |
|---|---|---|
| Unit testing | Verify isolated logic. | Pricing calculations, validation, role checks, state transitions. |
| Integration/API testing | Verify backend modules work together. | Auth/profile sync, vehicle verification, quote creation, request dispatch, offer acceptance, payment confirmation, reports, ratings. |
| Mobile UI testing | Verify user workflows and screen usability. | Client request flow, owner vehicle flow, offers, active trip, notifications, activity, earnings. |
| Regression testing | Verify new changes do not break completed phases. | Auth, request creation, owner acceptance, trip status, cash payment, rating/report, document upload. |
| Demo acceptance testing | Verify the system can be demonstrated end to end. | Client sends request, owner accepts, trip completes, owner confirms cash, client rates/reports. |

This approach was chosen because KULI is workflow-heavy. A single action usually affects multiple users and records, for example a client request creates offers for truck owners, owner acceptance closes competing offers, and trip completion enables cash confirmation and rating. Testing only individual screens would not be enough, so the project uses both backend tests and end-to-end manual workflow checks.

## 4.2 Special Tools Used

| Tool | Purpose | Special training required |
|---|---|---|
| Node.js test runner (`npm test`) | Runs backend automated unit and integration tests. | Basic command-line knowledge. |
| TypeScript compiler | Checks mobile TypeScript correctness. | Basic TypeScript understanding. |
| Repository lint script (`npm run lint`) | Checks required files and project structure. | No special training. |
| Repository typecheck script (`npm run typecheck`) | Validates shared contracts and route shells. | No special training. |
| Expo CLI | Runs and exports the mobile app for web/Android testing. | Basic Expo usage. |
| Docker Compose | Runs local MongoDB/Redis services. | Basic Docker knowledge. |
| Supabase dashboard | Checks authentication users, email confirmation, and password reset behavior. | Basic Supabase dashboard usage. |
| Browser developer tools | Tests Expo web and admin dashboard behavior. | Basic browser debugging knowledge. |
| Android emulator / Expo Go | Tests mobile behavior on Android-like screens. | Basic Android emulator/Expo usage. |

No advanced testing tool requires specialized professional training. A tester should know how to start the backend, start the mobile app, use demo accounts, read API errors, and record actual results in the test case document.

## 4.3 Metrics Collected

The following metrics are collected during testing:

| Metric | Level collected | Purpose |
|---|---|---|
| Number of test cases passed/failed/not run | Test case level | Measures test execution progress. |
| Number of backend automated tests passed/failed | Automated test level | Measures backend correctness. |
| Number of critical workflow failures | System level | Shows demo and acceptance readiness. |
| Number of UI defects by severity | UI regression level | Tracks usability and presentation quality. |
| Number of API/server errors during manual flows | Integration level | Tracks backend stability during real workflows. |
| Defect severity and priority | Defect level | Guides regression and fixing order. |
| Test execution date and build/commit | Configuration level | Links results to a specific version. |

MTBF (Mean Time Between Failures) was not used as a formal metric because the project is not running in long-term production. Instead, reliability is evaluated by repeated workflow completion, backend automated test pass rate, and absence of critical failures during demo flows.

SRE (Software Reliability Engineering) methodology was not formally applied. However, reliability ideas such as startup readiness checks, health checks, error visibility, and regression testing were used.

## 4.4 Configuration Management

Configuration management is handled through Git commits, environment files, and documented test environments.

- Each meaningful development or UI phase is committed with a professional Git commit message.
- Test results should record the branch or commit hash used.
- Environment variables are stored in `.env` files and examples are kept in `.env.example` where available.
- Secrets such as Supabase service keys are not written into test documents.
- Docker Compose is used for repeatable local infrastructure.
- Demo auth is allowed only for local development and UI exploration.
- Real Supabase authentication should be used for final confirmation where email limits allow.

If a defect is found, the tester should record:

- build or commit tested,
- user role tested,
- environment used,
- steps to reproduce,
- expected result,
- actual result,
- severity,
- screenshots or logs where useful.

## 4.5 Configurations Tested

The system is tested in several configurations because KULI has mobile, backend, database, and authentication dependencies.

| Configuration | Hardware/software | Purpose |
|---|---|---|
| Local backend with Docker services | Developer machine, Docker Compose, MongoDB/Redis | Main backend/API testing. |
| Mobile Expo web | Browser on developer machine | Low-resource mobile UI testing and demo preparation. |
| Android emulator / Expo Go | Android emulator when available | Mobile layout and device-like interaction testing. |
| Supabase auth configuration | Supabase project URL and anon key | Real login, registration, email confirmation, password reset. |
| Local demo auth | Local API and demo tokens | Repeatable UI testing without email OTP limits. |
| Admin web dashboard | Browser/Vite app | Staff, admin, verification, support, and operations testing. |

The main hardware used is a developer laptop/desktop. The main software stack includes Node.js, Expo, React Native, MongoDB, Redis, Supabase, and browser-based admin tools. The most important tested combinations are:

- mobile app + local API + local MongoDB/Redis,
- mobile app + local API + Supabase auth,
- admin dashboard + local API + local MongoDB/Redis,
- client mobile role + owner mobile role interacting through the same backend.

## 4.6 Regression Testing

Regression testing is performed after each significant backend or frontend change.

| Regression level | Amount of regression |
|---|---|
| Critical backend regression | Run all automated backend tests with `npm test`. |
| Mobile compile regression | Run mobile TypeScript check and Expo verification. |
| API contract regression | Run repository lint/typecheck and startup verification. |
| UI regression | Manually scan major mobile screens for layout, copy, status, and navigation issues. |
| End-to-end workflow regression | Repeat client-owner request flow for major marketplace changes. |

Regression testing is based on defect severity:

- Critical defects require full regression of the affected workflow and related backend tests.
- High defects require testing of the changed feature plus dependent workflows.
- Medium defects require focused regression around the affected screen or API.
- Low defects such as copy or spacing changes require visual regression checks.

Critical workflows always receive priority:

- authentication and role routing,
- vehicle verification and availability gating,
- quote and request creation,
- offer acceptance and first-accept-wins behavior,
- trip status updates,
- cash payment confirmation,
- rating/report/dispute actions.

## 4.7 Untestable or Unclear Requirements

Some requirements may be unclear, unavailable, or not testable in the current version. These are handled as follows:

- If a requirement is unclear, it is documented as an open question and clarified before implementation or final acceptance.
- If a requirement conflicts with security, the safer interpretation is used. For example, admin and assistant self-registration is not allowed on mobile.
- If a requirement needs unavailable external services, it is marked as out of scope or partially tested. For example, external SMS/email delivery is not fully tested unless provider keys are configured.
- If a requirement is future scope, the UI must not imply that it exists. For example, KULI v1 uses status-based tracking and static map previews, not live GPS tracking.
- If a requirement cannot be automated, it is added to manual test cases with clear steps and expected results.

## 4.8 Coverage Requirements

Because this is a project-level test plan, the full KULI system is tested as a connected product, not as isolated screens only.

The following component groups must be tested together:

- authentication, profile sync, and role routing,
- vehicle registration, document upload, verification, and availability,
- quote generation, candidate ranking, and request dispatch,
- owner offer inbox, acceptance, active job, and trip status updates,
- client tracking, messaging, cancellation, and notifications,
- trip history, rating, reports, payment dispute, and owner earnings,
- admin verification, support, reports, payments, and operations where applicable.

The full component is tested for acceptance, while individual modules are tested through automated backend tests and focused UI checks.

## 4.9 Special Testing Requirements

The following special requirements apply to KULI testing:

- State-changing actions must be backend-confirmed before success is shown.
- Admin and assistant workflows must not appear as public mobile registration choices.
- Unapproved vehicles must not go online or appear as available candidates.
- First-accept-wins behavior must be preserved when multiple owners receive the same request.
- Cash/manual payment must not be presented as digital payment.
- Static map/status-based tracking must not be described as live GPS.
- Error messages must be understandable for users and useful for developers.
- Test accounts and demo data must not expose real private documents or production credentials.

## 4.10 Summary

The KULI testing strategy combines automated backend verification, mobile/web UI checks, role-based workflow testing, and regression testing. This strategy is appropriate because the system’s main risk is not only whether screens render, but whether connected workflows remain correct across client, truck owner, staff, backend, database, and authentication services.
