import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const landingRoot = join(process.cwd(), 'apps/landing');

describe('Kulli Landing Page Production Suite', () => {
  it('dist/index.html is compiled and contains all semantic section landmarks', () => {
    const indexPath = join(landingRoot, 'dist/index.html');
    assert.ok(existsSync(indexPath), 'dist/index.html must exist after vite build');

    const html = readFileSync(indexPath, 'utf-8');

    // SEO & OpenGraph Meta
    assert.match(html, /<title>Kulli \| On-Demand Truck Logistics & Moving in Addis Ababa<\/title>/);
    assert.match(html, /name="description"/);
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:card"/);
    assert.match(html, /name="theme-color" content="#1F3B87"/);

    // Section 1: Navigation
    assert.match(html, /class="kulli-navbar"/);
    assert.match(html, /data-brand-logo/);
    assert.match(html, /Log in/);
    assert.match(html, /Sign up/);

    // Section 2: Authentic Hero Section
    assert.match(html, /id="hero"/);
    assert.match(html, /Ship Anything, Anytime, Everywhere with/);
    assert.match(html, /hero-accent-orange/);
    assert.match(html, /hero-home-moving\.jpg/);
    assert.match(html, /Book Now/);

    // Section 3: Drive & Earn Section (Phase 3)
    assert.match(html, /id="drivers"/);
    assert.match(html, /Drive when you want, Make/);
    assert.match(html, /accent-orange/);
    assert.match(html, /driver-cabin\.png/);
    assert.match(html, /Get Started/);
    assert.match(html, /Sign in/);

    // Section 4: Our Services Section (Phase 3)
    assert.match(html, /id="services"/);
    assert.match(html, /Our Services/);
    assert.match(html, /All moves can be scheduled in advance, or same day!/);
    assert.match(html, /Home and Office Moves/);
    assert.match(html, /B2B Logistics/);
    assert.match(html, /Construction and Jobsites/);
    assert.match(html, /shipment-truck\.png/);
    assert.match(html, /Learn more/);
    assert.match(html, /href="[^"]*about\.html"[^>]*>Learn more<\/a>/);

    // Section 5: Truck Types Catalog (Phase 4)
    assert.match(html, /id="fleet"/);
    assert.match(html, /Truck Types/);
    assert.match(html, /Delivery &amp; Moving on Demand/);
    assert.match(html, /Box Truck/);
    assert.match(html, /Cargo Van/);
    assert.match(html, /Pickup Truck/);
    assert.match(html, /box-truck\.jpg/);
    assert.match(html, /delivery-van\.png/);
    assert.match(html, /bedford-kb26\.png/);

    // Section 6: Apps Download Center (Phase 5)
    assert.match(html, /id="apps"/);
    assert.match(html, /It’s easier in the apps|It's easier in the apps/);
    assert.match(html, /Download the Kulli app/);
    assert.match(html, /Download the Driver app/);
    assert.match(html, /Scan to download/);
    assert.match(html, /qr-client-app\.svg/);
    assert.match(html, /qr-driver-app\.svg/);
    assert.match(html, /Google Play/);
    assert.match(html, /App Store/);

    // Section 7: FAQ Accordion & Side Image (Phase 4)
    assert.match(html, /id="faq"/);
    assert.match(html, /class="faq-accordion"/);
    assert.match(html, /Frequently Asked/);
    assert.match(html, /How do I book a truck\?/);
    assert.match(html, /Is Kulli available in my area\?/);
    assert.match(html, /Can I track my shipment in real time\?/);
    assert.match(html, /Do you have an iOS or Android app\?/);
    assert.match(html, /How do I register as a truck owner\?/);
    assert.match(html, /box-truck-moving\.jpg/);
    assert.match(html, /class="hotline-banner"/);
    assert.match(html, /8492/);

    // Section 8: Footer (Phase 5)
    assert.match(html, /class="kulli-footer"/);
    assert.match(html, /Bole/);
    assert.match(html, /Merkato/);
    assert.match(html, /Privacy Policy/);
    assert.match(html, /Terms of Service/);
  });

  it('dist/about.html is compiled and contains all semantic section landmarks', () => {
    const aboutPath = join(landingRoot, 'dist/about.html');
    assert.ok(existsSync(aboutPath), 'dist/about.html must exist after vite build');

    const html = readFileSync(aboutPath, 'utf-8');

    // Title & Meta
    assert.match(html, /<title>About Kulli \| How It Works &amp; Vehicle Selection Guide<\/title>/);
    assert.match(html, /class="about-hero"/);
    assert.match(html, /How to use the Kulli app/);

    // Walkthrough 3 steps
    assert.match(html, /1\. A customer opens the app/);
    assert.match(html, /2\. The customer is matched with a driver/);
    assert.match(html, /3\. The driver takes the cargo to the destination/);
    assert.match(html, /about-how-it-works\.jpg/);

    // Vehicle guide
    assert.match(html, /What Size Vehicle Should I Choose\?/);
    assert.match(html, /Box Truck/);
    assert.match(html, /Cargo Van/);
    assert.match(html, /Pickup Truck/);

    // Apps & Footer
    assert.match(html, /It’s easier in the apps|It's easier in the apps/);
    assert.match(html, /class="kulli-footer"/);
  });

  it('dist/login.html is compiled and contains split-screen auth with customer and driver roles', () => {
    const loginPath = join(landingRoot, 'dist/login.html');
    assert.ok(existsSync(loginPath), 'dist/login.html must exist after vite build');

    const html = readFileSync(loginPath, 'utf-8');
    assert.match(html, /<title>Log In \| Kulli Logistics Platform<\/title>/);
    assert.match(html, /class="auth-split-card"/);
    assert.match(html, /Welcome Back/);
    assert.match(html, /Customer Portal/);
    assert.match(html, /Driver Partner/);
    assert.match(html, /id="login-email"/);
    assert.match(html, /id="login-password"/);
    assert.match(html, /Remember Me/);
    assert.match(html, /Forgot Password\?/);
    assert.match(html, /verify-otp\.html/);
    assert.match(html, /signup\.html/);
  });

  it('dist/signup.html is compiled and contains split-screen registration with customer and driver options', () => {
    const signupPath = join(landingRoot, 'dist/signup.html');
    assert.ok(existsSync(signupPath), 'dist/signup.html must exist after vite build');

    const html = readFileSync(signupPath, 'utf-8');
    assert.match(html, /<title>Sign Up \| Kulli Logistics Platform<\/title>/);
    assert.match(html, /class="auth-split-card"/);
    assert.match(html, /Get started with Kulli/);
    assert.match(html, /Customer \/ Shipper/);
    assert.match(html, /Driver Partner/);
    assert.match(html, /id="signup-first-name"/);
    assert.match(html, /id="signup-last-name"/);
    assert.match(html, /id="signup-email"/);
    assert.match(html, /id="signup-phone"/);
    assert.match(html, /\+251/);
    assert.match(html, /signup-vehicle-class/);
    assert.match(html, /login\.html/);
  });

  it('dist/verify-otp.html is compiled and contains 6-digit OTP verification card and timer', () => {
    const otpPath = join(landingRoot, 'dist/verify-otp.html');
    assert.ok(existsSync(otpPath), 'dist/verify-otp.html must exist after vite build');

    const html = readFileSync(otpPath, 'utf-8');
    assert.match(html, /<title>OTP Verification \| Kulli Logistics Platform<\/title>/);
    assert.match(html, /class="auth-otp-card"/);
    assert.match(html, /OTP Verification/);
    assert.match(html, /class="otp-inputs-grid"/);
    assert.match(html, /class="otp-digit-input"/);
    assert.match(html, /data-otp-countdown/);
    assert.match(html, /Verify &amp; Continue|Verify & Continue/);
  });

  it('all required vector SVG graphics are present and valid', () => {
    const svgFiles = [
      'images/fleet-pickup.svg',
      'images/fleet-van.svg',
      'images/fleet-medium-flatbed.svg',
      'images/fleet-heavy-dumper.svg',
      'images/qr-client-app.svg',
      'images/qr-driver-app.svg',
      'logos/kulli-logo-primary.svg',
      'logos/kulli-logo-mono-light.svg',
      'logos/favicon.svg'
    ];

    for (const file of svgFiles) {
      const fullPath = join(landingRoot, 'public', file);
      assert.ok(existsSync(fullPath), `SVG file ${file} must exist in public/`);
      const content = readFileSync(fullPath, 'utf-8');
      assert.match(content, /<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${file} must be valid XML SVG`);
    }
  });

  it('all local variable font assets are present', () => {
    const fonts = [
      'fonts/PlusJakartaSans-Variable.woff2',
      'fonts/SpaceGrotesk-Variable.woff2'
    ];

    for (const font of fonts) {
      const fullPath = join(landingRoot, 'public', font);
      assert.ok(existsSync(fullPath), `Font file ${font} must exist in public/fonts/`);
    }
  });

  it('landing page and about page Book buttons route to /booking.html', () => {
    const indexPath = join(landingRoot, 'dist/index.html');
    const indexHtml = readFileSync(indexPath, 'utf-8');

    // Index Book links
    assert.match(indexHtml, /href="\/booking\.html"[^>]*>Book<\/a>/);
    assert.match(indexHtml, /href="\/booking\.html"[^>]*>Book Now<\/a>/);
    assert.match(indexHtml, /href="\/booking\.html\?vehicle=medium-truck"[^>]*>Book Now →<\/a>/);
    assert.match(indexHtml, /href="\/booking\.html\?vehicle=cargo-van"[^>]*>Book Now →<\/a>/);
    assert.match(indexHtml, /href="\/booking\.html\?vehicle=small-pickup"[^>]*>Book Now →<\/a>/);

    // About Book links
    const aboutPath = join(landingRoot, 'dist/about.html');
    const aboutHtml = readFileSync(aboutPath, 'utf-8');
    assert.match(aboutHtml, /href="\/booking\.html"[^>]*>Book<\/a>/);
    assert.match(aboutHtml, /href="\/booking\.html"[^>]*>Book Now<\/a>/);
  });

  it('dist/booking.html is compiled and contains two-column booking layout with route & pricing elements', () => {
    const bookingPath = join(landingRoot, 'dist/booking.html');
    assert.ok(existsSync(bookingPath), 'dist/booking.html must exist after vite build');

    const html = readFileSync(bookingPath, 'utf-8');
    assert.match(html, /<title>Book a Truck \| Kulli Logistics Platform Addis Ababa<\/title>/);
    assert.match(html, /class="prototype-banner"/);
    assert.match(html, /class="booking-stepper-card"/);
    assert.match(html, /id="input-origin"/);
    assert.match(html, /id="input-destination"/);
    assert.match(html, /id="map-pin-origin"/);
    assert.match(html, /id="map-pin-dest"/);
    assert.match(html, /id="route-map-preview"/);
    assert.match(html, /id="booking-live-summary"/);
    assert.match(html, /id="summary-cargo-tally"/);
    assert.match(html, /id="btn-booking-next"/);
    assert.match(html, /id="btn-mobile-next"/);

    // Phase 2 Nextories cargo inventory landmarks
    assert.match(html, /id="inventory-search-input"/);
    assert.match(html, /id="category-filter-pills"/);
    assert.match(html, /id="inv-total-count"/);
    assert.match(html, /id="inv-total-vol"/);
    assert.match(html, /id="inv-total-weight"/);
    assert.match(html, /id="btn-reset-inventory"/);
    assert.match(html, /id="cargo-items-grid"/);
    assert.match(html, /id="btn-add-custom-item"/);
    assert.match(html, /id="custom-item-name"/);
    assert.match(html, /id="flag-fragile"/);
    assert.match(html, /id="flag-heavy"/);
    assert.match(html, /id="flag-weather"/);
    assert.match(html, /id="cargo-photo-dropzone"/);
    assert.match(html, /id="photo-thumbnails-strip"/);

    // Phase 3 Vehicle selection & Loading schedule landmarks
    assert.match(html, /id="vehicle-cards-container"/);
    assert.match(html, /id="pickup-floor"/);
    assert.match(html, /id="pickup-elevator"/);
    assert.match(html, /id="dropoff-floor"/);
    assert.match(html, /id="dropoff-elevator"/);
    assert.match(html, /data-helper-tier="0"/);
    assert.match(html, /data-helper-tier="1"/);
    assert.match(html, /data-helper-tier="2"/);
    assert.match(html, /id="btn-sched-immediate"/);
    assert.match(html, /id="btn-sched-later"/);
    assert.match(html, /id="scheduled-later-fields"/);
    assert.match(html, /id="scheduled-date-input"/);
    assert.match(html, /data-time-slot="afternoon"/);
    assert.match(html, /id="sender-name"/);
    assert.match(html, /id="sender-phone"/);
    assert.match(html, /id="recipient-name"/);
    assert.match(html, /id="recipient-phone"/);
    assert.match(html, /id="special-delivery-instructions"/);
    assert.match(html, /id="summary-base-label"/);
    assert.match(html, /id="summary-helpers-label"/);
    assert.match(html, /id="summary-stairs-row"/);
    assert.match(html, /id="summary-stairs-fare"/);

    // Phase 4 Uber Freight Review & Auth Gate landmarks
    assert.match(html, /id="review-card-route"/);
    assert.match(html, /id="review-origin-name"/);
    assert.match(html, /id="review-dest-name"/);
    assert.match(html, /id="review-card-cargo"/);
    assert.match(html, /id="review-cargo-total-count"/);
    assert.match(html, /id="review-cargo-chips"/);
    assert.match(html, /id="review-card-vehicle"/);
    assert.match(html, /id="review-vehicle-name"/);
    assert.match(html, /id="review-card-labor"/);
    assert.match(html, /id="review-sender-name"/);
    assert.match(html, /id="review-recipient-name"/);
    assert.match(html, /id="review-card-pricing"/);
    assert.match(html, /id="review-price-total-val"/);
    assert.match(html, /data-review-edit-step="1"/);
    assert.match(html, /data-review-edit-step="2"/);
    assert.match(html, /data-review-edit-step="3"/);
    assert.match(html, /data-review-edit-step="4"/);
    assert.match(html, /id="btn-review-confirm-cta"/);
    assert.match(html, /id="auth-gate-modal"/);
    assert.match(html, /id="auth-modal-step-phone"/);
    assert.match(html, /id="auth-gate-phone-input"/);
    assert.match(html, /id="btn-auth-gate-send-otp"/);
    assert.match(html, /id="auth-modal-step-otp"/);
    assert.match(html, /id="auth-gate-otp-inputs"/);
    assert.match(html, /id="btn-auth-otp-autofill"/);
    assert.match(html, /id="btn-auth-gate-verify-otp"/);
    assert.match(html, /id="auth-modal-step-success"/);
  });

  it('dist/tracking.html is compiled and contains real-time status tracker, simulator, and driver card', () => {
    const trackingPath = join(landingRoot, 'dist/tracking.html');
    assert.ok(existsSync(trackingPath), 'dist/tracking.html must exist after vite build');

    const html = readFileSync(trackingPath, 'utf-8');
    assert.match(html, /<title>Track Shipment \| Kulli Logistics Addis Ababa<\/title>/);
    assert.match(html, /id="confirmation-banner"/);
    assert.match(html, /id="hero-order-ref"/);
    assert.match(html, /id="btn-copy-ref"/);
    assert.match(html, /id="btn-sim-prev"/);
    assert.match(html, /id="btn-sim-next"/);
    assert.match(html, /id="btn-sim-autoplay"/);
    assert.match(html, /id="btn-sim-reset"/);
    assert.match(html, /id="tracking-order-ref"/);
    assert.match(html, /id="tracking-status-badge"/);
    assert.match(html, /id="map-truck-marker-group"/);
    assert.match(html, /class="driver-profile-card"/);
    assert.match(html, /Abebe Tadesse/);
    assert.match(html, /id="btn-open-chat"/);
    assert.match(html, /class="tracking-timeline-wrap"/);
    assert.match(html, /id="timeline-progress-fill"/);
    assert.match(html, /id="tracking-step-1"/);
    assert.match(html, /id="tracking-step-6"/);
    assert.match(html, /class="tracking-step-node"/);
    assert.match(html, /id="manifest-cargo-tally"/);
    assert.match(html, /id="driver-chat-modal"/);
  });
});
