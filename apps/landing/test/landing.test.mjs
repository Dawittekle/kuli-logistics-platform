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
});
