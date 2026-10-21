/* ============================================================
   Kulli Landing Page — Client-Side Auth Interactions
   Role Toggles, Password Toggles, OTP Navigation & Countdown
   ============================================================ */

export function initAuthInteractions(): void {
  initRoleTabs();
  initPasswordToggles();
  initOtpInputs();
  initOtpTimer();
}

/**
 * 1. Role Switcher (Customer vs Driver Partner)
 */
function initRoleTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.auth-role-tab');
  const driverFields = document.querySelectorAll<HTMLElement>('[data-role-field="driver"]');
  const customerFields = document.querySelectorAll<HTMLElement>('[data-role-field="customer"]');
  const headlineEl = document.querySelector<HTMLElement>('[data-auth-headline]');
  const tagEl = document.querySelector<HTMLElement>('[data-auth-tag]');
  const submitBtn = document.querySelector<HTMLButtonElement>('[data-auth-submit]');

  if (!tabs.length) return;

  const setRole = (role: 'customer' | 'driver'): void => {
    tabs.forEach((tab) => {
      const isMatch = tab.dataset.roleTab === role;
      tab.classList.toggle('is-active', isMatch);
      tab.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    driverFields.forEach((el) => {
      el.style.display = role === 'driver' ? 'flex' : 'none';
      const inputs = el.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select');
      inputs.forEach((input) => {
        if (role === 'driver') {
          input.removeAttribute('disabled');
        } else {
          input.setAttribute('disabled', 'true');
        }
      });
    });

    customerFields.forEach((el) => {
      el.style.display = role === 'customer' ? 'flex' : 'none';
    });

    if (headlineEl) {
      if (role === 'driver') {
        headlineEl.textContent = 'Drive your truck, earn on your terms with Kulli.';
      } else {
        headlineEl.textContent = 'Powering fast, dependable deliveries across Addis Ababa.';
      }
    }

    if (tagEl) {
      tagEl.textContent = role === 'driver' ? 'Driver Partner Portal' : 'Customer & Shipper Network';
    }

    if (submitBtn) {
      const isSignup = document.body.dataset.authMode === 'signup';
      if (isSignup) {
        submitBtn.textContent = role === 'driver' ? 'Register as Driver Partner' : 'Create Customer Account';
      } else {
        submitBtn.textContent = role === 'driver' ? 'Log In to Driver Portal' : 'Log In to Account';
      }
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetRole = (tab.dataset.roleTab as 'customer' | 'driver') || 'customer';
      setRole(targetRole);

      // Keep URL query in sync
      const url = new URL(window.location.href);
      url.searchParams.set('role', targetRole);
      window.history.replaceState({}, '', url.toString());
    });
  });

  // Check initial URL param ?role=driver
  const params = new URLSearchParams(window.location.search);
  const initialRole = params.get('role');
  if (initialRole === 'driver') {
    setRole('driver');
  } else {
    setRole('customer');
  }
}

/**
 * 2. Password Visibility Toggle
 */
function initPasswordToggles(): void {
  const toggleButtons = document.querySelectorAll<HTMLButtonElement>('.password-toggle-btn');

  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.password-input-wrap');
      if (!wrap) return;
      const input = wrap.querySelector<HTMLInputElement>('input');
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.innerHTML = isPassword
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
  });
}

/**
 * 3. OTP 6-Digit Auto-Advance & Paste
 */
function initOtpInputs(): void {
  const digits = Array.from(document.querySelectorAll<HTMLInputElement>('.otp-digit-input'));
  if (!digits.length) return;

  digits.forEach((input, idx) => {
    // Digit entry auto-advance
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = target.value.replace(/[^0-9]/g, '');
      target.value = val ? val[0] : '';

      if (val && idx < digits.length - 1) {
        digits[idx + 1].focus();
      }
    });

    // Backspace retreat
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digits[idx - 1].focus();
      }
    });

    // Paste handling
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || (window as unknown as { clipboardData?: DataTransfer }).clipboardData)
        ?.getData('text')
        .replace(/[^0-9]/g, '') || '';

      if (!pasteData) return;

      const chars = pasteData.slice(0, digits.length).split('');
      chars.forEach((ch, i) => {
        if (digits[i]) {
          digits[i].value = ch;
        }
      });

      const nextFocus = Math.min(chars.length, digits.length - 1);
      digits[nextFocus].focus();
    });
  });
}

/**
 * 4. OTP Countdown Timer (01:00 -> 00:00)
 */
function initOtpTimer(): void {
  const timerCount = document.querySelector<HTMLElement>('[data-otp-countdown]');
  const resendBtn = document.querySelector<HTMLButtonElement>('[data-otp-resend]');
  if (!timerCount) return;

  let seconds = 60;

  const updateTimer = (): void => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerCount.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (seconds <= 0) {
      if (resendBtn) {
        resendBtn.removeAttribute('disabled');
      }
      return;
    }

    seconds--;
    setTimeout(updateTimer, 1000);
  };

  if (resendBtn) {
    resendBtn.setAttribute('disabled', 'true');
    resendBtn.addEventListener('click', () => {
      seconds = 60;
      resendBtn.setAttribute('disabled', 'true');
      updateTimer();
    });
  }

  updateTimer();
}

// Auto-run if running on an auth page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthInteractions);
} else {
  initAuthInteractions();
}
