/* ============================================================
   Kulli Landing Page — Client Application Entry Point
   ============================================================ */

// Import Core CSS
import './styles/fonts.css';
import './styles/theme.css';
import './styles/typography.css';
import './styles/layout.css';
import './styles/landing.css';

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

  // Initial setup
  const currentTheme = getSavedTheme();
  applyTheme(currentTheme);

  // Event listeners
  themeToggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(active);
    });
  });

  // Listen for system theme changes if user hasn't explicitly overridden
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
// DOM Ready Lifecycle Initialization
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavbarScroll();
  initMobileDrawer();
  console.log('Kulli Landing Page v1.0 initialized.');
});
