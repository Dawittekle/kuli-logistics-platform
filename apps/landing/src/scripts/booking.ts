/* ============================================================
   Kulli Logistics Platform — Client-Side Booking Flow Controller
   Multi-Step Wizard, Autocomplete, Draft Persistence & Route Calc
   ============================================================ */

import { ADDIS_LOCATIONS, type AddisLocation } from '../data/addis-locations';
import { FLEET_CATALOG, type FleetVehicle } from '../data/fleet-catalog';

export interface BookingState {
  currentStep: number;
  origin: string;
  originDetails?: string;
  originCoords?: { lat: number; lng: number };
  destination: string;
  destinationDetails?: string;
  destinationCoords?: { lat: number; lng: number };
  stops: string[];
  vehicleTier: string;
  distanceKm: number;
  durationMins: number;
  helpersCount: number;
  stairsFloors: number;
  isImmediate: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  specialInstructions?: string;
}

const STORAGE_KEY = 'kuli_booking_draft_v1';

export class BookingWizardController {
  private state: BookingState;

  constructor() {
    this.state = this.loadDraft() || {
      currentStep: 1,
      origin: 'Bole Medhanialem, Addis Ababa',
      originCoords: { lat: 8.9806, lng: 38.7903 },
      destination: 'Merkato Wholesale District, Addis Ababa',
      destinationCoords: { lat: 9.0347, lng: 38.7352 },
      stops: [],
      vehicleTier: 'medium-truck',
      distanceKm: 14.8,
      durationMins: 32,
      helpersCount: 1,
      stairsFloors: 0,
      isImmediate: true
    };
  }

  public init(): void {
    this.readUrlParams();
    this.setupStepper();
    this.setupAutocomplete();
    this.setupStopsHandler();
    this.setupNavigationButtons();
    this.updateSummaryReceipt();
    this.goToStep(this.state.currentStep);
  }

  private loadDraft(): BookingState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public saveDraft(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage unavailable or disabled
    }
  }

  private readUrlParams(): void {
    const params = new URLSearchParams(window.location.search);
    const vehicleParam = params.get('vehicle');
    if (vehicleParam) {
      this.state.vehicleTier = vehicleParam;
    }
    const stepParam = params.get('step');
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (parsed >= 1 && parsed <= 5) {
        this.state.currentStep = parsed;
      }
    }
  }

  public goToStep(stepNumber: number): void {
    if (stepNumber < 1 || stepNumber > 5) return;
    this.state.currentStep = stepNumber;
    this.saveDraft();

    // Toggle visible step panel
    for (let i = 1; i <= 5; i++) {
      const panel = document.getElementById(`step-panel-${i}`);
      if (panel) {
        panel.style.display = i === stepNumber ? 'block' : 'none';
      }
      const stepperItem = document.querySelector(`[data-step-target="${i}"]`);
      if (stepperItem) {
        stepperItem.classList.toggle('is-active', i === stepNumber);
        stepperItem.classList.toggle('is-complete', i < stepNumber);
      }
    }

    // Toggle Prev / Next buttons
    const prevBtn = document.getElementById('btn-booking-prev') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('btn-booking-next') as HTMLButtonElement | null;
    const mobileNextBtn = document.getElementById('btn-mobile-next') as HTMLButtonElement | null;

    if (prevBtn) {
      prevBtn.style.display = stepNumber === 1 ? 'none' : 'inline-flex';
    }

    const nextText = stepNumber === 5 ? 'Confirm Booking ✓' : 'Continue →';
    if (nextBtn) {
      nextBtn.textContent = nextText;
    }
    if (mobileNextBtn) {
      mobileNextBtn.textContent = nextText;
    }

    this.updateSummaryReceipt();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private setupStepper(): void {
    const stepButtons = document.querySelectorAll<HTMLButtonElement>('[data-step-target]');
    stepButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = parseInt(btn.dataset.stepTarget || '1', 10);
        if (target <= this.state.currentStep || this.validateCurrentStep()) {
          this.goToStep(target);
        }
      });
    });
  }

  private validateCurrentStep(): boolean {
    if (this.state.currentStep === 1) {
      return Boolean(this.state.origin.trim() && this.state.destination.trim());
    }
    return true;
  }

  private setupAutocomplete(): void {
    const originInput = document.getElementById('input-origin') as HTMLInputElement | null;
    const destInput = document.getElementById('input-destination') as HTMLInputElement | null;
    const originDropdown = document.getElementById('origin-autocomplete') as HTMLElement | null;
    const destDropdown = document.getElementById('dest-autocomplete') as HTMLElement | null;

    if (originInput && originDropdown) {
      this.attachLocationAutocomplete(originInput, originDropdown, (selected) => {
        this.state.origin = selected.name;
        this.state.originCoords = { lat: selected.lat, lng: selected.lng };
        this.recalculateRoute();
      });
    }

    if (destInput && destDropdown) {
      this.attachLocationAutocomplete(destInput, destDropdown, (selected) => {
        this.state.destination = selected.name;
        this.state.destinationCoords = { lat: selected.lat, lng: selected.lng };
        this.recalculateRoute();
      });
    }
  }

  private attachLocationAutocomplete(
    input: HTMLInputElement,
    dropdown: HTMLElement,
    onSelect: (item: AddisLocation) => void
  ): void {
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        dropdown.classList.remove('is-open');
        dropdown.innerHTML = '';
        return;
      }

      const matches = ADDIS_LOCATIONS.filter(
        (loc) => loc.name.toLowerCase().includes(query) || loc.subcity.toLowerCase().includes(query)
      ).slice(0, 5);

      if (!matches.length) {
        dropdown.classList.remove('is-open');
        dropdown.innerHTML = '';
        return;
      }

      dropdown.innerHTML = matches
        .map(
          (loc) => `
        <div class="autocomplete-item" data-location-id="${loc.id}">
          <span class="autocomplete-name">${loc.name}</span>
          <span class="autocomplete-subcity">${loc.subcity} — ${loc.detail}</span>
        </div>
      `
        )
        .join('');
      dropdown.classList.add('is-open');

      dropdown.querySelectorAll('.autocomplete-item').forEach((item) => {
        item.addEventListener('click', () => {
          const locId = (item as HTMLElement).dataset.locationId;
          const found = ADDIS_LOCATIONS.find((l) => l.id === locId);
          if (found) {
            input.value = `${found.name}, Addis Ababa`;
            dropdown.classList.remove('is-open');
            onSelect(found);
          }
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        dropdown.classList.remove('is-open');
      }
    });
  }

  private setupStopsHandler(): void {
    const addStopBtn = document.getElementById('btn-add-stop');
    const stopsContainer = document.getElementById('intermediate-stops-list');

    if (addStopBtn && stopsContainer) {
      addStopBtn.addEventListener('click', () => {
        if (this.state.stops.length >= 2) {
          alert('Maximum 2 intermediate stops allowed in visual prototype.');
          return;
        }

        const stopIndex = this.state.stops.length + 1;
        const stopId = `stop-${Date.now()}`;
        this.state.stops.push('');

        const stopEl = document.createElement('div');
        stopEl.className = 'stop-card-item form-group';
        stopEl.id = stopId;
        stopEl.innerHTML = `
          <label class="form-label">
            <span class="stop-badge is-stop">Stop ${stopIndex}</span>
            <button type="button" class="btn-remove-stop" style="background:none;border:none;color:#B91C1C;cursor:pointer;font-size:0.75rem;">✕ Remove</button>
          </label>
          <div class="input-with-icon">
            <span class="input-icon-left">📍</span>
            <input type="text" class="form-input" placeholder="Enter stop address or neighborhood..." />
          </div>
        `;

        stopsContainer.appendChild(stopEl);

        const removeBtn = stopEl.querySelector('.btn-remove-stop');
        removeBtn?.addEventListener('click', () => {
          stopEl.remove();
          this.state.stops.pop();
          this.recalculateRoute();
        });

        const stopInput = stopEl.querySelector('input');
        stopInput?.addEventListener('input', (e) => {
          this.state.stops[stopIndex - 1] = (e.target as HTMLInputElement).value;
          this.saveDraft();
        });
      });
    }
  }

  private setupNavigationButtons(): void {
    const prevBtn = document.getElementById('btn-booking-prev');
    const nextBtn = document.getElementById('btn-booking-next');
    const mobileNextBtn = document.getElementById('btn-mobile-next');

    const handleNext = (): void => {
      if (this.state.currentStep < 5) {
        if (this.validateCurrentStep()) {
          this.goToStep(this.state.currentStep + 1);
        }
      } else {
        // Step 5: Trigger Confirm or Auth
        this.onConfirmBooking();
      }
    };

    const handlePrev = (): void => {
      if (this.state.currentStep > 1) {
        this.goToStep(this.state.currentStep - 1);
      }
    };

    nextBtn?.addEventListener('click', handleNext);
    mobileNextBtn?.addEventListener('click', handleNext);
    prevBtn?.addEventListener('click', handlePrev);
  }

  private recalculateRoute(): void {
    // Deterministic distance calculation between origin and destination
    let baseDist = 14.8;
    if (this.state.originCoords && this.state.destinationCoords) {
      const dLat = (this.state.destinationCoords.lat - this.state.originCoords.lat) * 111;
      const dLng = (this.state.destinationCoords.lng - this.state.originCoords.lng) * 111 * Math.cos(this.state.originCoords.lat * (Math.PI / 180));
      baseDist = Math.max(3.2, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 1.35 * 10) / 10);
    }

    // Add 4.5km per extra stop
    const totalDist = baseDist + this.state.stops.length * 4.5;
    const estDuration = Math.round(totalDist * 2.2);

    this.state.distanceKm = totalDist;
    this.state.durationMins = estDuration;

    // Update map metrics UI
    const distEl = document.getElementById('route-distance-metric');
    const durEl = document.getElementById('route-duration-metric');
    if (distEl) distEl.textContent = `${totalDist.toFixed(1)} km`;
    if (durEl) durEl.textContent = `${estDuration} min`;

    this.updateSummaryReceipt();
    this.saveDraft();
  }

  public updateSummaryReceipt(): void {
    // Match vehicle tier
    const vehicle = FLEET_CATALOG.find((v) => v.vehicleTierSlug === this.state.vehicleTier) || FLEET_CATALOG[2];

    const baseFare = vehicle.baseFare;
    const distanceFee = Math.round(this.state.distanceKm * vehicle.perKmRate);
    const helperFee = this.state.helpersCount * 350;
    const stairsFee = this.state.stairsFloors * 100;
    const totalFare = baseFare + distanceFee + helperFee + stairsFee;

    // Elements
    const routeBriefEl = document.getElementById('summary-route-brief');
    const baseFareEl = document.getElementById('summary-base-fare');
    const distFareEl = document.getElementById('summary-distance-fare');
    const distSubtextEl = document.getElementById('summary-distance-subtext');
    const helperFareEl = document.getElementById('summary-helpers-fare');
    const totalFareEl = document.getElementById('summary-total-fare');
    const mobileFareEl = document.getElementById('mobile-total-fare');

    if (routeBriefEl) {
      routeBriefEl.textContent = `${this.state.origin.split(',')[0]} → ${this.state.destination.split(',')[0]}`;
    }
    if (baseFareEl) baseFareEl.textContent = `${baseFare.toLocaleString()} ETB`;
    if (distFareEl) distFareEl.textContent = `${distanceFee.toLocaleString()} ETB`;
    if (distSubtextEl) distSubtextEl.textContent = `(${this.state.distanceKm.toFixed(1)} km × ${vehicle.perKmRate} ETB/km)`;
    if (helperFareEl) helperFareEl.textContent = `${helperFee.toLocaleString()} ETB`;
    if (totalFareEl) totalFareEl.textContent = `${totalFare.toLocaleString()} ETB`;
    if (mobileFareEl) mobileFareEl.textContent = `${totalFare.toLocaleString()} ETB`;
  }

  private onConfirmBooking(): void {
    // Generate reference number
    const randomRef = `KL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    window.location.href = `/tracking.html?ref=${randomRef}`;
  }
}

// Auto-instantiate when running on booking page
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const wizard = new BookingWizardController();
      wizard.init();
    });
  } else {
    const wizard = new BookingWizardController();
    wizard.init();
  }
}
