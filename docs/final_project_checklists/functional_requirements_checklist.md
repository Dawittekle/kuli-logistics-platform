# Final Project Functional Requirements Checklist

Source: `docs/Final Project - Kuli.pdf`, section `2.4.2 Functional Requirements`.

Use the `Checklist` column during review:

- `[ ]` Not checked
- `[~]` Partially checked
- `[x]` Verified

Note: the PDF labels the Truck Owner Dashboard sub-requirements as `FR-7.1` through `FR-7.5` under `FR-10`. This checklist keeps those original source IDs in `PDF ID` and adds normalized IDs in `Checklist ID`.

| Checklist | Checklist ID | PDF ID | Area | Functional requirement | Primary actors | Review notes |
|---|---|---|---|---|---|---|
| [ ] | FR-1.1 | FR-1.1 | User Accounts and Authentication | Allow users to register as one of four roles: Client, Truck Owner, Call-Center Assistant, or Administrator. | Client, Truck Owner, Assistant, Admin | Public staff self-registration should remain restricted by current security docs. |
| [ ] | FR-1.2 | FR-1.2 | User Accounts and Authentication | Support email/phone-based registration and password or OTP authentication for all roles. | All roles | Verify Supabase email/password and OTP behavior separately. |
| [ ] | FR-1.3 | FR-1.3 | User Accounts and Authentication | Support role-based login and present role-specific dashboards immediately after authentication. | All roles | Check mobile client/owner routing and web admin/assistant routing. |
| [ ] | FR-1.4 | FR-1.4 | User Accounts and Authentication | Allow users to reset passwords and recover accounts via secure OTP or email links. | All roles | Confirm Supabase reset flow is exposed in UI before final demo. |
| [ ] | FR-2.1 | FR-2.1 | Truck Owner Verification and Onboarding | Provide a truck owner verification workflow that collects vehicle details, identity documents, and proof of ownership/insurance. | Truck Owner | Include vehicle details and document upload/take-photo checks. |
| [ ] | FR-2.2 | FR-2.2 | Truck Owner Verification and Onboarding | Allow administrators to review, approve, or reject truck owner applications and record the decision with timestamps. | Admin | Verify audit/timestamp behavior on approve and reject. |
| [ ] | FR-2.3 | FR-2.3 | Truck Owner Verification and Onboarding | Prevent unverified truck owners from accepting requests or appearing in public listings. | Truck Owner, Client | Check matching excludes pending/rejected vehicles and offer acceptance blocks invalid vehicles. |
| [ ] | FR-2.4 | FR-2.4 | Truck Owner Verification and Onboarding | Notify truck owners of verification status changes via in-app notification and SMS/email. | Truck Owner, Admin | In-app exists; SMS/email depend on provider configuration. |
| [ ] | FR-3.1 | FR-3.1 | Service Request Creation and Management | Allow clients to create a logistics service request with pickup location, destination, item type, item dimensions/volume, weight, preferred pickup date/time, and special handling instructions. | Client | Check Addis location selector, pickup schedule, load fields, and special handling. |
| [ ] | FR-3.2 | FR-3.2 | Service Request Creation and Management | Validate required fields and provide inline guidance for acceptable values, such as max volume per truck type. | Client | Confirm field-level messages and vehicle capacity feedback. |
| [ ] | FR-3.3 | FR-3.3 | Service Request Creation and Management | Allow clients to cancel a submitted request within configurable policy windows. | Client | Check pending, accepted, and en-route cancellation behavior. |
| [ ] | FR-4.1 | FR-4.1 | Matching, Discovery, and Filtering | Present a proximity-based list of available verified truck owners sorted by distance, availability, and aggregate rating. | Client | Confirm backend geospatial ranking and mobile candidate card order. |
| [ ] | FR-4.2 | FR-4.2 | Matching, Discovery, and Filtering | Provide filters for truck type and capacity. | Client | Vehicle class picker covers type/capacity; verify class list from backend. |
| [ ] | FR-4.3 | FR-4.3 | Matching, Discovery, and Filtering | Support automatic matching that suggests the top N truck owners based on distance, capacity, availability, ratings, and dispute history. | Client, Backend | Confirm ranking score inputs and dispute penalty behavior. |
| [ ] | FR-5.1 | FR-5.1 | Pricing, Quotation, and Payments | Calculate and display trip cost estimates using configurable pricing rules that consider truck type, load size/volume, travel distance, estimated duration, toll charges, fuel prices, and optional services, with future vehicle-type extension. | Client, Admin | Current pricing includes configurable rules; verify all listed cost factors before final. |
| [ ] | FR-5.2 | FR-5.2 | Pricing, Quotation, and Payments | Support payment flows: pay-on-acceptance, pay-on-delivery, and pay-in-advance, with digital payments possibly later. | Client, Truck Owner, Admin | Pay-on-delivery/manual cash is current MVP; other flows remain future-capable. |
| [ ] | FR-5.3 | FR-5.3 | Pricing, Quotation, and Payments | Record payment transactions. | Truck Owner, Admin | Verify payment record creation, confirmation, dispute, and admin resolution. |
| [ ] | FR-6.1 | FR-6.1 | Trip Execution and Real-Time Tracking | Provide real-time status updates for each shipment: Requested, Matched, Accepted, En Route to Pickup, Loading, In Transit, Unloading, Completed, and Cancelled. | Client, Truck Owner | Current v1 uses manual status updates plus refresh/polling, not continuous GPS telemetry. |
| [ ] | FR-6.2 | FR-6.2 | Trip Execution and Real-Time Tracking | Allow authorized truck owners or drivers to manually update predefined shipment statuses. | Truck Owner | Check status transition map and owner-only authorization. |
| [ ] | FR-6.3 | FR-6.3 | Trip Execution and Real-Time Tracking | Maintain a complete event log for each trip with timestamps. | Client, Truck Owner, Admin | Verify status timeline on mobile and request oversight in admin. |
| [ ] | FR-7.1 | FR-7.1 | Communication and Notifications | Provide in-app messaging between clients and truck owners with message history tied to the service request. | Client, Truck Owner | Check active-trip chat and terminal archive behavior. |
| [ ] | FR-7.2 | FR-7.2 | Communication and Notifications | Support call-assisted booking where authorized call-center assistants can create or modify requests on behalf of clients and record the operator ID. | Assistant, Client | Verify assisted booking links request to assistant/ticket. |
| [ ] | FR-7.3 | FR-7.3 | Communication and Notifications | Send notifications via in-app, SMS, and email for request submission, acceptance, driver en route, arrival, completion, cancellations, and payment receipts. | All roles | In-app exists; SMS/email need provider configuration. |
| [ ] | FR-7.4 | FR-7.4 | Communication and Notifications | Allow users to configure notification preferences and opt out of non-essential messages. | Client, Truck Owner | Transactional in-app alerts must remain on. |
| [ ] | FR-8.1 | FR-8.1 | Ratings, Reviews, and Dispute Resolution | Allow clients to submit numeric ratings and textual reviews for completed trips. | Client | Verify rating modal after completion and history detail action. |
| [ ] | FR-8.2 | FR-8.2 | Ratings, Reviews, and Dispute Resolution | Compute an aggregate rating score for each truck owner based on completed service ratings. | Backend, Truck Owner | Check owner rating summary and aggregate recalculation. |
| [ ] | FR-8.3 | FR-8.3 | Ratings, Reviews, and Dispute Resolution | Make aggregate ratings available to matching and filtering to influence provider ranking and selection. | Client, Backend | Candidate cards should reflect rating and ranking score. |
| [ ] | FR-8.4 | FR-8.4 | Ratings, Reviews, and Dispute Resolution | Provide a dispute workflow where clients or truck owners can submit complaints with supporting evidence and administrators can review, mediate, and record outcomes. | Client, Truck Owner, Admin | Verify report creation, evidence upload/camera, and admin resolution. |
| [ ] | FR-8.5 | FR-8.5 | Ratings, Reviews, and Dispute Resolution | Flag or penalize truck owners with unresolved or frequent disputes, affecting visibility in matching results. | Backend, Admin | Verify visibility penalty and matching effect. |
| [ ] | FR-9.1 | FR-9.1 | Administration and Reporting | Provide an administrative dashboard for user management, service oversight, verification queue, pricing rules, and system health metrics. | Admin | Check admin users, vehicles, pricing, reports/payments, requests, metrics, and health. |
| [ ] | FR-10.1 | FR-7.1 under FR-10 | Truck Owner Dashboard | Provide a dashboard for registered truck owners to manage their activities. | Truck Owner | Normalized from PDF numbering. |
| [ ] | FR-10.2 | FR-7.2 under FR-10 | Truck Owner Dashboard | Allow truck owners to view and respond to trip requests, and monitor active and completed trips. | Truck Owner | Check offer inbox, active trip detail, history/earnings context. |
| [ ] | FR-10.3 | FR-7.3 under FR-10 | Truck Owner Dashboard | Allow truck owners to update trip status, such as Accepted, Loading, In Transit, and Completed. | Truck Owner | Check immediate UI update after backend status mutation. |
| [ ] | FR-10.4 | FR-7.4 under FR-10 | Truck Owner Dashboard | Allow truck owners to manage their availability. | Truck Owner | Check approved-only availability and active vehicle behavior. |
| [ ] | FR-10.5 | FR-7.5 under FR-10 | Truck Owner Dashboard | Allow truck owners to view their aggregated ratings. | Truck Owner | Check owner earnings/rating summary. |
