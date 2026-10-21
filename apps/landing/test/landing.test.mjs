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

    // Section 3: Trust Strip
    assert.match(html, /id="trust"/);
    assert.match(html, /5,000\+/);
    assert.match(html, /450\+/);
    assert.match(html, /&lt; 28 min/);
    assert.match(html, /100%/);

    // Section 4: How It Works
    assert.match(html, /id="how-it-works"/);
    assert.match(html, /Select Route &amp; Load/);
    assert.match(html, /Instant Guaranteed Quote/);
    assert.match(html, /Live Cargo Tracking/);
    assert.match(html, /Inspect &amp; Pay on Delivery/);

    // Section 5: Fleet Catalog
    assert.match(html, /id="fleet"/);
    assert.match(html, /Small Pickup/);
    assert.match(html, /Closed Cargo Van/);
    assert.match(html, /Medium Flatbed/);
    assert.match(html, /Heavy Freight &amp; Tipper/);
    assert.match(html, /Bedford KB26/);
    assert.match(html, /Isuzu NPR/);

    // Section 6: Commercial B2B
    assert.match(html, /id="business"/);
    assert.match(html, /Multi-Stop Route Dispatch/);
    assert.match(html, /Digital Proof of Delivery/);
    assert.match(html, /Monthly Corporate Invoicing/);

    // Section 7: Drivers & Partners
    assert.match(html, /id="drivers"/);
    assert.match(html, /Keep the Full Fare on Day 1/);
    assert.match(html, /Smart Return Loads/);
    assert.match(html, /data-action="open-driver-signup"/);

    // Section 8: Apps Download Center
    assert.match(html, /id="apps"/);
    assert.match(html, /Kulli Customer App/);
    assert.match(html, /Kulli Driver Partner App/);
    assert.match(html, /qr-client-app\.svg/);
    assert.match(html, /qr-driver-app\.svg/);
    assert.match(html, /Google Play/);
    assert.match(html, /App Store/);

    // Section 9: FAQ Accordion & Hotline
    assert.match(html, /id="faq"/);
    assert.match(html, /class="faq-accordion"/);
    assert.match(html, /class="hotline-banner"/);
    assert.match(html, /8492/);

    // Section 10: Footer
    assert.match(html, /class="kulli-footer"/);
    assert.match(html, /Bole/);
    assert.match(html, /Merkato/);
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
