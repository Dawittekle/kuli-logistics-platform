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

// Import Data & Calculator Engines
import { ADDIS_LOCATIONS } from './data/addis-locations';
import { VEHICLE_TIERS } from './data/vehicle-classes';
import { calculateQuote, calculateDriverEarnings } from './scripts/rate-calculator';

// ------------------------------------------------------------
// Theme Switcher Logic (Light / Dark Mode with Persistence)
// ------------------------------------------------------------
function initTheme(): void {
  const themeToggleBtns = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
  const brandLogos = document.querySelectorAll<HTMLImageElement>('[data-brand-logo]');

  const getSavedTheme = (): 'light' | 'dark' => {
    const saved = localStorage.getItem('kulli-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyTheme = (theme: 'light' | 'dark'): void => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kulli-theme', theme);

    themeToggleBtns.forEach((btn) => {
      const icon = btn.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    });

    brandLogos.forEach((logo) => {
      if (theme === 'dark') {
        logo.src = '/logos/kulli-logo-mono-light.svg';
      } else {
        logo.src = '/logos/kulli-logo-primary.svg';
      }
    });
  };

  const currentTheme = getSavedTheme();
  applyTheme(currentTheme);

  themeToggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(active);
    });
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('kulli-theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
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
// DOM Ready Lifecycle Initialization
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavbarScroll();
  initMobileDrawer();
  initHeroInteractive();
  console.log('Kulli Landing Page: Phase 1 & 2 fully loaded.');
});
