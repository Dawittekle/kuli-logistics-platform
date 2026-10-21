/* ============================================================
   Kulli Landing Page — Client Application Entry Point
   ============================================================ */

// Import Core CSS & Section Styles
import './styles/fonts.css';
import './styles/theme.css';
import './styles/typography.css';
import './styles/layout.css';
import './styles/landing.css';
import './styles/hero.css';
import './styles/features.css';
import './styles/b2b-faq.css';
import './styles/apps-download.css';

// Import Data & Calculator Engines
import { ADDIS_LOCATIONS } from './data/addis-locations';
import { VEHICLE_TIERS } from './data/vehicle-classes';
import { calculateQuote, calculateDriverEarnings } from './scripts/rate-calculator';

// ------------------------------------------------------------
// Theme Initialization (Clean Light Identity)
// ------------------------------------------------------------
function initTheme(): void {
  document.documentElement.setAttribute('data-theme', 'light');
  const brandLogos = document.querySelectorAll<HTMLImageElement>('[data-brand-logo]');
  brandLogos.forEach((logo) => {
    logo.src = '/logos/kulli-logo-primary.svg';
  });
}

// ------------------------------------------------------------
// Sticky Navbar Elevation & Scroll State
// ------------------------------------------------------------
function initNavbarScroll(): void {
  const navbar = document.querySelector<HTMLElement>('.kulli-navbar');
  if (!navbar) return;

  const handleScroll = (): void => {
    if (window.scrollY > 20) {
      navbar.classList.add('is-scrolled');
    } else {
      navbar.classList.remove('is-scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

// ------------------------------------------------------------
// Mobile Navigation Drawer Toggle
// ------------------------------------------------------------
function initMobileDrawer(): void {
  const burgerBtn = document.querySelector<HTMLButtonElement>('[data-drawer-trigger]');
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-drawer-close]');
  const drawer = document.querySelector<HTMLElement>('.mobile-drawer');
  const scrim = document.querySelector<HTMLElement>('.mobile-scrim');
  const drawerLinks = document.querySelectorAll<HTMLAnchorElement>('.mobile-drawer-link');

  if (!burgerBtn || !drawer || !scrim) return;

  const openDrawer = (): void => {
    drawer.classList.add('is-open');
    scrim.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  };

  const closeDrawer = (): void => {
    drawer.classList.remove('is-open');
    scrim.classList.remove('is-open');
    document.body.style.overflow = '';
    burgerBtn.focus();
  };

  burgerBtn.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);

  drawerLinks.forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });
}

// ------------------------------------------------------------
// Phase 2: Dual-Audience Tabs & Interactive Rate Calculator
// ------------------------------------------------------------
function initHeroInteractive(): void {
  // 1. Dual-Audience Tab Switcher
  const tabBtns = document.querySelectorAll<HTMLButtonElement>('[data-hero-tab]');
  const tabPanels = document.querySelectorAll<HTMLElement>('[data-hero-panel]');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-hero-tab');
      tabBtns.forEach((b) => b.classList.remove('is-active'));
      tabPanels.forEach((p) => p.classList.remove('is-active'));

      btn.classList.add('is-active');
      const panel = document.querySelector<HTMLElement>(`[data-hero-panel="${target}"]`);
      if (panel) {
        panel.classList.add('is-active');
      }
    });
  });

  // 2. Populate Location Dropdowns
  const pickupSelect = document.getElementById('calcPickup') as HTMLSelectElement | null;
  const destSelect = document.getElementById('calcDestination') as HTMLSelectElement | null;
  const swapBtn = document.getElementById('swapLocationsBtn') as HTMLButtonElement | null;

  if (pickupSelect && destSelect) {
    ADDIS_LOCATIONS.forEach((loc) => {
      const opt1 = document.createElement('option');
      opt1.value = loc.id;
      opt1.textContent = `${loc.name} (${loc.subcity})`;
      pickupSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = loc.id;
      opt2.textContent = `${loc.name} (${loc.subcity})`;
      destSelect.appendChild(opt2);
    });

    // Default selections: Merkato -> Bole Medhanialem
    pickupSelect.value = 'merkato';
    destSelect.value = 'bole-medhanialem';
  }

  // 3. Vehicle Tier Selection State
  let selectedTierSlug = 'medium-truck';
  const tierOptions = document.querySelectorAll<HTMLElement>('[data-tier-option]');

  tierOptions.forEach((opt) => {
    opt.addEventListener('click', () => {
      tierOptions.forEach((o) => o.classList.remove('is-selected'));
      opt.classList.add('is-selected');
      const slug = opt.getAttribute('data-tier-option');
      if (slug) {
        selectedTierSlug = slug;
        updateQuoteUI();
      }
    });
  });

  // 4. Update Quote UI Engine
  const updateQuoteUI = (): void => {
    if (!pickupSelect || !destSelect) return;

    const pickupId = pickupSelect.value;
    const destId = destSelect.value;
    const quote = calculateQuote(pickupId, destId, selectedTierSlug);

    // Update Left Column Calculator Results
    const fareEl = document.getElementById('calcFareTotal');
    const etaEl = document.getElementById('calcFareEta');
    const breakdownEl = document.getElementById('calcBreakdown');

    if (fareEl) fareEl.textContent = `${quote.estimatedFare.toLocaleString()} ETB`;
    if (etaEl) etaEl.textContent = `${quote.distanceKm} km • ~${quote.etaMinutes} mins estimated transit`;
    if (breakdownEl) {
      breakdownEl.textContent = `Base fare ${quote.baseFare} ETB + ${quote.distanceFare} ETB distance rate (${quote.tier.perKmRate} ETB/km)`;
    }

    // Update Right Column Live Preview Card
    const previewOrigin = document.getElementById('previewOriginName');
    const previewOriginSub = document.getElementById('previewOriginSub');
    const previewDest = document.getElementById('previewDestName');
    const previewDestSub = document.getElementById('previewDestSub');
    const previewDistance = document.getElementById('previewDistancePill');
    const previewFare = document.getElementById('previewFareValue');
    const previewVehicleName = document.getElementById('previewVehicleName');
    const previewVehicleModels = document.getElementById('previewVehicleModels');

    if (previewOrigin) previewOrigin.textContent = quote.pickup.name;
    if (previewOriginSub) previewOriginSub.textContent = quote.pickup.subcity;
    if (previewDest) previewDest.textContent = quote.destination.name;
    if (previewDestSub) previewDestSub.textContent = quote.destination.subcity;
    if (previewDistance) previewDistance.textContent = `${quote.distanceKm} km via Ring Road • ~${quote.etaMinutes} min`;
    if (previewFare) previewFare.textContent = `${quote.estimatedFare.toLocaleString()} ETB`;
    if (previewVehicleName) previewVehicleName.textContent = quote.tier.name;
    if (previewVehicleModels) previewVehicleModels.textContent = quote.tier.exampleModels;
  };

  pickupSelect?.addEventListener('change', updateQuoteUI);
  destSelect?.addEventListener('change', updateQuoteUI);

  // Swap Locations
  swapBtn?.addEventListener('click', () => {
    if (!pickupSelect || !destSelect) return;
    const temp = pickupSelect.value;
    pickupSelect.value = destSelect.value;
    destSelect.value = temp;
    updateQuoteUI();
  });

  // Initial Calculation
  updateQuoteUI();

  // 5. Driver Partner Earnings Simulator (Tab 2)
  const tripsSlider = document.getElementById('driverTripsSlider') as HTMLInputElement | null;
  const tripsCountLabel = document.getElementById('driverTripsCount');
  const driverTierSelect = document.getElementById('driverTierSelect') as HTMLSelectElement | null;
  const weeklyGrossEl = document.getElementById('driverWeeklyGross');
  const monthlyGrossEl = document.getElementById('driverMonthlyGross');

  const updateDriverEarningsUI = (): void => {
    if (!tripsSlider) return;
    const trips = parseInt(tripsSlider.value, 10);
    const tierSlug = driverTierSelect?.value || 'medium-truck';

    if (tripsCountLabel) tripsCountLabel.textContent = `${trips} trips/week`;

    const earnings = calculateDriverEarnings(tierSlug, trips);
    if (weeklyGrossEl) weeklyGrossEl.textContent = `${earnings.estimatedWeeklyGross.toLocaleString()} ETB`;
    if (monthlyGrossEl) monthlyGrossEl.textContent = `${Math.round(earnings.estimatedMonthlyGross).toLocaleString()} ETB`;
  };

  tripsSlider?.addEventListener('input', updateDriverEarningsUI);
  driverTierSelect?.addEventListener('change', updateDriverEarningsUI);
  updateDriverEarningsUI();
}

// ------------------------------------------------------------
// Fleet Catalog Quick Select Integration
// ------------------------------------------------------------
function initFleetCatalogInteractions(): void {
  const selectBtns = document.querySelectorAll<HTMLButtonElement>('[data-select-tier]');
  const shipperRadioInputs = document.querySelectorAll<HTMLInputElement>('input[name="vehicleClass"]');
  const shipperTabBtn = document.querySelector<HTMLButtonElement>('[data-hero-tab="shipper"]');
  const heroSection = document.getElementById('hero');

  selectBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tierSlug = btn.getAttribute('data-select-tier');
      if (!tierSlug) return;

      // 1. Switch to shipper tab if currently on driver tab
      if (shipperTabBtn && !shipperTabBtn.classList.contains('is-active')) {
        shipperTabBtn.click();
      }

      // 2. Select corresponding radio button
      const targetRadio = Array.from(shipperRadioInputs).find((r) => r.value === tierSlug);
      if (targetRadio) {
        targetRadio.checked = true;
        // Trigger change event to re-calculate fare and sync live route card
        targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 3. Smooth scroll up to hero rate calculator
      if (heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ------------------------------------------------------------
// Accessible FAQ Accordion with Full Keyboard Navigation
// ------------------------------------------------------------
function initFaqAccordion(): void {
  const faqItems = document.querySelectorAll<HTMLElement>('.faq-item');
  const questionButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.faq-question-btn'));

  if (!faqItems.length || !questionButtons.length) return;

  const toggleItem = (item: HTMLElement, open?: boolean): void => {
    const btn = item.querySelector<HTMLButtonElement>('.faq-question-btn');
    const panel = item.querySelector<HTMLElement>('.faq-answer-panel');
    if (!btn || !panel) return;

    const isCurrentlyOpen = item.classList.contains('is-open');
    const shouldOpen = open !== undefined ? open : !isCurrentlyOpen;

    if (shouldOpen) {
      // Close other accordion items for clean focus
      faqItems.forEach((other) => {
        if (other !== item && other.classList.contains('is-open')) {
          toggleItem(other, false);
        }
      });

      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      panel.removeAttribute('hidden');
    } else {
      item.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('hidden', '');
    }
  };

  questionButtons.forEach((btn, index) => {
    const parentItem = btn.closest<HTMLElement>('.faq-item');
    if (!parentItem) return;

    btn.addEventListener('click', () => {
      toggleItem(parentItem);
    });

    btn.addEventListener('keydown', (e: KeyboardEvent) => {
      let targetIndex = index;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          targetIndex = (index + 1) % questionButtons.length;
          questionButtons[targetIndex]?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          targetIndex = (index - 1 + questionButtons.length) % questionButtons.length;
          questionButtons[targetIndex]?.focus();
          break;
        case 'Home':
          e.preventDefault();
          questionButtons[0]?.focus();
          break;
        case 'End':
          e.preventDefault();
          questionButtons[questionButtons.length - 1]?.focus();
          break;
        case 'Escape':
          if (parentItem.classList.contains('is-open')) {
            toggleItem(parentItem, false);
          }
          break;
      }
    });
  });

  // Open first FAQ item by default
  if (faqItems[0]) {
    toggleItem(faqItems[0], true);
  }
}

// ------------------------------------------------------------
// Driver Partner CTAs Cross-Section Navigation
// ------------------------------------------------------------
function initDriverPartnerCtas(): void {
  const driverCtas = document.querySelectorAll<HTMLElement>('[data-action="open-driver-signup"]');
  const driverTabBtn = document.querySelector<HTMLButtonElement>('[data-hero-tab="driver"]');
  const heroSection = document.getElementById('hero');

  driverCtas.forEach((cta) => {
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      if (driverTabBtn && !driverTabBtn.classList.contains('is-active')) {
        driverTabBtn.click();
      }
      if (heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ------------------------------------------------------------
// DOM Ready Lifecycle Initialization
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavbarScroll();
  initMobileDrawer();
  initHeroInteractive();
  initFleetCatalogInteractions();
  initFaqAccordion();
  initDriverPartnerCtas();
  console.log('Kulli Landing Page: All Phases (1, 2, 3, 4 & 5) fully loaded.');
});
