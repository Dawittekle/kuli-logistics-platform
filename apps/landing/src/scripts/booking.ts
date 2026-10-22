/* ============================================================
   Kulli Logistics Platform — Client-Side Booking Flow Controller
   Multi-Step Wizard, Autocomplete, Nextories Cargo, Fleet & Access
   ============================================================ */

import { ADDIS_LOCATIONS, type AddisLocation } from '../data/addis-locations';
import { FLEET_CATALOG, type FleetVehicle } from '../data/fleet-catalog';
import { CARGO_CATALOG, CARGO_CATEGORIES, type CargoItem } from '../data/cargo-catalog';

export interface CustomCargoItem {
  id: string;
  name: string;
  volumeM3: number;
  weightKg: number;
  quantity: number;
}

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
  stairsFee: number;
  isImmediate: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  specialInstructions?: string;
  // Phase 2: Cargo Inventory & Manifest
  cargoInventory: Record<string, number>;
  customItems: CustomCargoItem[];
  totalVolumeM3: number;
  totalWeightKg: number;
  totalItemsCount: number;
  isFragile: boolean;
  isHeavy: boolean;
  isWeatherSensitive: boolean;
  cargoPhotos: string[];
  activeCategory: string;
  inventorySearchQuery: string;
  // Phase 3: Access & Labor Details
  pickupFloor: number;
  pickupElevator: boolean;
  pickupWalkingDistance: 'short' | 'long';
  dropoffFloor: number;
  dropoffElevator: boolean;
  dropoffWalkingDistance: 'short' | 'long';
}

const STORAGE_KEY = 'kuli_booking_draft_v1';

export class BookingWizardController {
  private state: BookingState;

  constructor() {
    const saved = this.loadDraft();
    this.state = saved || {
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
      stairsFee: 0,
      isImmediate: true,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: 'Morning (08:00 - 10:00)',
      senderName: 'Dawit Tadesse',
      senderPhone: '+251 91 123 4567',
      recipientName: 'Abebe Bekele',
      recipientPhone: '+251 92 987 6543',
      specialInstructions: 'Commercial loading dock Gate 3, call before arrival.',
      cargoInventory: {
        'sofa-3-seater': 1,
        'dining-table': 1,
        'dining-chair': 4,
        'fridge-double': 1,
        'box-standard': 6
      },
      customItems: [],
      totalVolumeM3: 5.6,
      totalWeightKg: 280,
      totalItemsCount: 13,
      isFragile: false,
      isHeavy: true,
      isWeatherSensitive: true,
      cargoPhotos: [],
      activeCategory: 'all',
      inventorySearchQuery: '',
      pickupFloor: 0,
      pickupElevator: true,
      pickupWalkingDistance: 'short',
      dropoffFloor: 1,
      dropoffElevator: false,
      dropoffWalkingDistance: 'short'
    };

    // Ensure collections exist
    if (!this.state.cargoInventory) this.state.cargoInventory = {};
    if (!this.state.customItems) this.state.customItems = [];
    if (!this.state.cargoPhotos) this.state.cargoPhotos = [];
    if (!this.state.activeCategory) this.state.activeCategory = 'all';
    if (!this.state.inventorySearchQuery) this.state.inventorySearchQuery = '';
    if (this.state.pickupFloor === undefined) this.state.pickupFloor = 0;
    if (this.state.dropoffFloor === undefined) this.state.dropoffFloor = 0;
    if (this.state.helpersCount === undefined) this.state.helpersCount = 1;
    if (this.state.stairsFee === undefined) this.state.stairsFee = 0;
  }

  public init(): void {
    this.readUrlParams();
    this.setupStepper();
    this.setupAutocomplete();
    this.setupStopsHandler();
    this.setupNavigationButtons();
    this.setupCargoInventory();
    this.setupHandlingFlags();
    this.setupPhotoUploadDropzone();
    this.setupMapPinInteractions();
    this.setupVehicleSelection();
    this.setupAccessDetailsHandlers();
    this.setupReviewEditHandlers();
    this.setupAuthGateModal();
    this.updateInventoryTotals();
    this.recalculateStairsSurcharge();
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
    const authParam = params.get('auth');
    if (authParam === 'open') {
      setTimeout(() => this.openAuthGateModal(), 100);
    } else if (authParam === 'otp') {
      setTimeout(() => {
        this.openAuthGateModal();
        const sendBtn = document.getElementById('btn-auth-gate-send-otp') as HTMLButtonElement | null;
        sendBtn?.click();
      }, 100);
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

    // Refresh vehicle cards when entering Step 3
    if (stepNumber === 3) {
      this.setupVehicleSelection();
    }

    // Refresh review summary when entering Step 5
    if (stepNumber === 5) {
      this.renderReviewSummary();
    }

    // Toggle Prev / Next buttons
    const prevBtn = document.getElementById('btn-booking-prev') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('btn-booking-next') as HTMLButtonElement | null;
    const mobileNextBtn = document.getElementById('btn-mobile-next') as HTMLButtonElement | null;

    if (prevBtn) {
      prevBtn.style.display = stepNumber === 1 ? 'none' : 'inline-flex';
    }

    const nextText = stepNumber === 5 ? 'Request Truck ✓' : 'Continue →';
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
      const originInput = document.getElementById('input-origin') as HTMLInputElement | null;
      const destInput = document.getElementById('input-destination') as HTMLInputElement | null;
      const originVal = originInput ? originInput.value.trim() : this.state.origin;
      const destVal = destInput ? destInput.value.trim() : this.state.destination;
      if (!originVal || !destVal) {
        alert('Please specify both a pickup origin and drop-off destination.');
        return false;
      }
      this.state.origin = originVal;
      this.state.destination = destVal;
      return true;
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
        this.state.origin = `${selected.name}, Addis Ababa`;
        this.state.originCoords = { lat: selected.lat, lng: selected.lng };
        this.recalculateRoute();
      });
    }

    if (destInput && destDropdown) {
      this.attachLocationAutocomplete(destInput, destDropdown, (selected) => {
        this.state.destination = `${selected.name}, Addis Ababa`;
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
        this.openAuthGateModal();
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
    let baseDist = 14.8;
    if (this.state.originCoords && this.state.destinationCoords) {
      const dLat = (this.state.destinationCoords.lat - this.state.originCoords.lat) * 111;
      const dLng = (this.state.destinationCoords.lng - this.state.originCoords.lng) * 111 * Math.cos(this.state.originCoords.lat * (Math.PI / 180));
      baseDist = Math.max(3.2, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 1.35 * 10) / 10);
    }

    const totalDist = baseDist + this.state.stops.length * 4.5;
    const estDuration = Math.round(totalDist * 2.2);

    this.state.distanceKm = totalDist;
    this.state.durationMins = estDuration;

    const distEl = document.getElementById('route-distance-metric');
    const durEl = document.getElementById('route-duration-metric');
    if (distEl) distEl.textContent = `${totalDist.toFixed(1)} km`;
    if (durEl) durEl.textContent = `${estDuration} min`;

    this.setupVehicleSelection();
    this.updateSummaryReceipt();
    this.saveDraft();
  }

  /* ------------------------------------------------------------
     Phase 2: Cargo Inventory & Nextories Selector
     ------------------------------------------------------------ */
  private setupCargoInventory(): void {
    this.renderCategoryPills();
    this.renderCargoItems();
    this.setupInventorySearch();
    this.setupCustomItemHandlers();
  }

  private renderCategoryPills(): void {
    const container = document.getElementById('category-filter-pills');
    if (!container) return;

    container.innerHTML = CARGO_CATEGORIES.map(
      (cat) => `
      <button
        type="button"
        class="category-pill ${this.state.activeCategory === cat.id ? 'is-active' : ''}"
        data-category-id="${cat.id}"
      >
        ${cat.label}
      </button>
    `
    ).join('');

    container.querySelectorAll<HTMLButtonElement>('.category-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catId = btn.dataset.categoryId || 'all';
        this.state.activeCategory = catId;
        this.renderCategoryPills();
        this.renderCargoItems();
      });
    });
  }

  private renderCargoItems(): void {
    const container = document.getElementById('cargo-items-grid');
    if (!container) return;

    const query = this.state.inventorySearchQuery.trim().toLowerCase();
    const activeCat = this.state.activeCategory;

    const filtered = CARGO_CATALOG.filter((item) => {
      const matchCat = activeCat === 'all' || item.category === activeCat;
      const matchQuery = !query || item.name.toLowerCase().includes(query) || item.categoryLabel.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: #71717A;">
          <p style="font-size: 1rem; font-weight: 600;">No items found matching "${this.state.inventorySearchQuery}"</p>
          <p style="font-size: 0.8125rem;">Try searching for something else or use "+ Add Custom Item" below.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((item) => {
        const count = this.state.cargoInventory[item.id] || 0;
        const isSelected = count > 0;
        return `
        <div class="cargo-item-card ${isSelected ? 'is-selected' : ''}" data-item-id="${item.id}">
          <div class="item-meta">
            <span class="item-icon">${item.icon}</span>
            <div class="item-text">
              <span class="item-name" title="${item.name}">${item.name}</span>
              <span class="item-specs">${item.volumeM3} m³ • ~${item.weightKg} kg</span>
            </div>
          </div>
          <div class="item-stepper">
            <button type="button" class="btn-stepper btn-sub" data-action="sub" aria-label="Decrease quantity">−</button>
            <span class="stepper-count">${count}</span>
            <button type="button" class="btn-stepper btn-add" data-action="add" aria-label="Increase quantity">+</button>
          </div>
        </div>
      `;
      })
      .join('');

    // Attach stepper listeners
    container.querySelectorAll('.cargo-item-card').forEach((card) => {
      const itemId = (card as HTMLElement).dataset.itemId;
      if (!itemId) return;

      const subBtn = card.querySelector('[data-action="sub"]');
      const addBtn = card.querySelector('[data-action="add"]');

      subBtn?.addEventListener('click', () => {
        const current = this.state.cargoInventory[itemId] || 0;
        if (current > 0) {
          if (current === 1) {
            delete this.state.cargoInventory[itemId];
          } else {
            this.state.cargoInventory[itemId] = current - 1;
          }
          this.updateInventoryTotals();
          this.renderCargoItems();
        }
      });

      addBtn?.addEventListener('click', () => {
        const current = this.state.cargoInventory[itemId] || 0;
        this.state.cargoInventory[itemId] = current + 1;
        this.updateInventoryTotals();
        this.renderCargoItems();
      });
    });
  }

  private setupInventorySearch(): void {
    const searchInput = document.getElementById('inventory-search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.state.inventorySearchQuery = searchInput.value;
      this.renderCargoItems();
    });

    const resetBtn = document.getElementById('btn-reset-inventory');
    resetBtn?.addEventListener('click', () => {
      if (confirm('Clear all selected items from cargo inventory?')) {
        this.state.cargoInventory = {};
        this.state.customItems = [];
        this.updateInventoryTotals();
        this.renderCargoItems();
        this.renderCustomItemsList();
      }
    });
  }

  private setupCustomItemHandlers(): void {
    const addBtn = document.getElementById('btn-add-custom-item');
    const nameInput = document.getElementById('custom-item-name') as HTMLInputElement | null;
    const volInput = document.getElementById('custom-item-vol') as HTMLInputElement | null;
    const weightInput = document.getElementById('custom-item-weight') as HTMLInputElement | null;

    addBtn?.addEventListener('click', () => {
      if (!nameInput || !nameInput.value.trim()) {
        alert('Please enter a custom item name.');
        return;
      }

      const name = nameInput.value.trim();
      const vol = parseFloat(volInput?.value || '0.5') || 0.5;
      const weight = parseFloat(weightInput?.value || '20') || 20;

      const newItem: CustomCargoItem = {
        id: `custom-${Date.now()}`,
        name,
        volumeM3: vol,
        weightKg: weight,
        quantity: 1
      };

      this.state.customItems.push(newItem);
      nameInput.value = '';
      if (volInput) volInput.value = '0.5';
      if (weightInput) weightInput.value = '20';

      this.updateInventoryTotals();
      this.renderCustomItemsList();
    });

    this.renderCustomItemsList();
  }

  private renderCustomItemsList(): void {
    const container = document.getElementById('custom-items-list');
    if (!container) return;

    if (!this.state.customItems.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.state.customItems
      .map(
        (item, idx) => `
      <div class="custom-item-row">
        <span>✨ <strong>${item.name}</strong> (${item.volumeM3} m³, ~${item.weightKg} kg)</span>
        <button type="button" class="btn-remove-custom" data-index="${idx}" style="background:none;border:none;color:#B91C1C;cursor:pointer;font-weight:700;">
          ✕ Remove
        </button>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('.btn-remove-custom').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.state.customItems.splice(idx, 1);
        this.updateInventoryTotals();
        this.renderCustomItemsList();
      });
    });
  }

  private updateInventoryTotals(): void {
    let totalVol = 0;
    let totalWeight = 0;
    let totalCount = 0;

    // Standard items
    for (const [itemId, qty] of Object.entries(this.state.cargoInventory)) {
      const catalogItem = CARGO_CATALOG.find((c) => c.id === itemId);
      if (catalogItem && qty > 0) {
        totalVol += catalogItem.volumeM3 * qty;
        totalWeight += catalogItem.weightKg * qty;
        totalCount += qty;
      }
    }

    // Custom items
    for (const item of this.state.customItems) {
      totalVol += item.volumeM3 * item.quantity;
      totalWeight += item.weightKg * item.quantity;
      totalCount += item.quantity;
    }

    this.state.totalVolumeM3 = Math.round(totalVol * 10) / 10;
    this.state.totalWeightKg = Math.round(totalWeight);
    this.state.totalItemsCount = totalCount;

    // UI Updates
    const countEl = document.getElementById('inv-total-count');
    const volEl = document.getElementById('inv-total-vol');
    const weightEl = document.getElementById('inv-total-weight');
    const summaryCargoTally = document.getElementById('summary-cargo-tally');

    if (countEl) countEl.textContent = `${totalCount} items`;
    if (volEl) volEl.textContent = `${this.state.totalVolumeM3.toFixed(1)} m³`;
    if (weightEl) weightEl.textContent = `~${this.state.totalWeightKg.toLocaleString()} kg`;
    if (summaryCargoTally) {
      summaryCargoTally.textContent = `${totalCount} items (${this.state.totalVolumeM3.toFixed(1)} m³) • ~${this.state.totalWeightKg} kg`;
    }

    // Auto-check heavy flag if weight > 50kg or volume > 1m³
    if (totalWeight > 50) {
      const heavyCheckbox = document.getElementById('flag-heavy') as HTMLInputElement | null;
      if (heavyCheckbox && !this.state.isHeavy) {
        heavyCheckbox.checked = true;
        this.state.isHeavy = true;
        heavyCheckbox.closest('.flag-toggle-card')?.classList.add('is-checked');
      }
    }

    this.setupVehicleSelection();
    this.updateSummaryReceipt();
    this.saveDraft();
  }

  private setupHandlingFlags(): void {
    const flags = [
      { id: 'flag-fragile', key: 'isFragile' as const },
      { id: 'flag-heavy', key: 'isHeavy' as const },
      { id: 'flag-weather', key: 'isWeatherSensitive' as const }
    ];

    flags.forEach(({ id, key }) => {
      const checkbox = document.getElementById(id) as HTMLInputElement | null;
      if (!checkbox) return;

      checkbox.checked = Boolean(this.state[key]);
      checkbox.closest('.flag-toggle-card')?.classList.toggle('is-checked', checkbox.checked);

      checkbox.addEventListener('change', () => {
        this.state[key] = checkbox.checked;
        checkbox.closest('.flag-toggle-card')?.classList.toggle('is-checked', checkbox.checked);
        this.setupVehicleSelection();
        this.saveDraft();
      });
    });
  }

  private setupPhotoUploadDropzone(): void {
    const dropzone = document.getElementById('cargo-photo-dropzone');
    const fileInput = document.getElementById('cargo-photo-input') as HTMLInputElement | null;
    const thumbsStrip = document.getElementById('photo-thumbnails-strip');

    if (!dropzone || !fileInput || !thumbsStrip) return;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#1F3B87';
      dropzone.style.backgroundColor = '#F0F4FF';
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#CBD5E1';
      dropzone.style.backgroundColor = '#FFFFFF';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#CBD5E1';
      dropzone.style.backgroundColor = '#FFFFFF';
      if (e.dataTransfer?.files) {
        this.handleImageFiles(Array.from(e.dataTransfer.files));
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files) {
        this.handleImageFiles(Array.from(fileInput.files));
      }
    });

    this.renderPhotoThumbnails();
  }

  private handleImageFiles(files: File[]): void {
    const valid = files.filter((f) => f.type.startsWith('image/')).slice(0, 4 - this.state.cargoPhotos.length);
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result && this.state.cargoPhotos.length < 4) {
          this.state.cargoPhotos.push(result);
          this.renderPhotoThumbnails();
          this.saveDraft();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  private renderPhotoThumbnails(): void {
    const strip = document.getElementById('photo-thumbnails-strip');
    if (!strip) return;

    strip.innerHTML = this.state.cargoPhotos
      .map(
        (src, idx) => `
      <div class="photo-thumb-card">
        <img src="${src}" alt="Cargo thumbnail ${idx + 1}" class="photo-thumb-img" />
        <button type="button" class="btn-remove-thumb" data-photo-idx="${idx}" title="Remove photo">✕</button>
      </div>
    `
      )
      .join('');

    strip.querySelectorAll('.btn-remove-thumb').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.photoIdx || '0', 10);
        this.state.cargoPhotos.splice(idx, 1);
        this.renderPhotoThumbnails();
        this.saveDraft();
      });
    });
  }

  private setupMapPinInteractions(): void {
    const originPin = document.getElementById('map-pin-origin');
    const destPin = document.getElementById('map-pin-dest');

    originPin?.addEventListener('click', () => {
      alert(`Pickup Location: ${this.state.origin}\nCoordinates: 8.9806° N, 38.7903° E`);
    });

    destPin?.addEventListener('click', () => {
      alert(`Destination: ${this.state.destination}\nCoordinates: 9.0347° N, 38.7352° E`);
    });
  }

  /* ------------------------------------------------------------
     Phase 3: Step 3 Truck Selection & Fleet Comparison
     ------------------------------------------------------------ */
  public calculateRecommendedVehicle(): string {
    const vol = this.state.totalVolumeM3;
    const weight = this.state.totalWeightKg;
    const weather = this.state.isWeatherSensitive;

    if (vol <= 4.8 && weight <= 1400 && !weather) {
      return 'small-pickup';
    } else if (vol <= 8.8 && weight <= 1900) {
      return 'cargo-van';
    } else if (vol <= 17.5 && weight <= 4200) {
      return 'medium-truck';
    } else {
      return 'large-truck';
    }
  }

  public setupVehicleSelection(): void {
    const container = document.getElementById('vehicle-cards-container');
    if (!container) return;

    const recommendedSlug = this.calculateRecommendedVehicle();

    // Map volumes for each vehicle
    const vehicleVolumes: Record<string, number> = {
      'small-pickup': 5.2,
      'cargo-van': 9.2,
      'medium-truck': 18.5,
      'large-truck': 18.0
    };

    container.innerHTML = FLEET_CATALOG.map((v) => {
      const isSelected = this.state.vehicleTier === v.vehicleTierSlug;
      const isRecommended = recommendedSlug === v.vehicleTierSlug;
      const maxVol = vehicleVolumes[v.vehicleTierSlug] || 15.0;
      const fillPercent = Math.min(100, Math.round((this.state.totalVolumeM3 / maxVol) * 100));
      const estFare = v.baseFare + Math.round(this.state.distanceKm * v.perKmRate);

      let imageSrc = '/images/bedford-kb26.png';
      if (v.vehicleTierSlug === 'cargo-van') imageSrc = '/images/delivery-van.png';
      if (v.vehicleTierSlug === 'medium-truck') imageSrc = '/images/box-truck.jpg';
      if (v.vehicleTierSlug === 'large-truck') imageSrc = '/images/fleet-heavy-dumper.svg';

      return `
        <div
          class="vehicle-tier-card ${isSelected ? 'is-selected' : ''} ${isRecommended ? 'is-recommended' : ''}"
          data-vehicle-slug="${v.vehicleTierSlug}"
          role="radio"
          aria-checked="${isSelected ? 'true' : 'false'}"
        >
          ${isRecommended ? '<div class="vehicle-recommend-badge"><span>✨</span> Recommended Fit</div>' : ''}
          <div class="vehicle-card-media">
            <img src="${imageSrc}" alt="${v.name}" class="vehicle-card-img" loading="lazy" />
          </div>

          <div class="vehicle-card-info">
            <div class="vehicle-card-title-row">
              <h3 class="vehicle-card-name">${v.name}</h3>
              ${v.badge ? `<span class="vehicle-badge-pill">${v.badge}</span>` : ''}
            </div>
            <div class="vehicle-card-models">${v.modelName}</div>

            <div class="vehicle-specs-row">
              <span class="vehicle-spec-item">⚖️ <strong>${v.payload}</strong></span>
              <span class="vehicle-spec-item">📐 <strong>${v.dimensions}</strong></span>
              <span class="vehicle-spec-item">📦 <strong>${v.volume}</strong></span>
            </div>

            <div style="margin-top: 0.25rem;">
              <div style="display:flex; justify-content:space-between; font-size: 0.6875rem; color: #71717A;">
                <span>Cargo Space Utilization</span>
                <span>${fillPercent}%</span>
              </div>
              <div class="vehicle-capacity-bar">
                <div class="capacity-fill ${fillPercent > 95 ? 'is-overloaded' : ''}" style="width: ${fillPercent}%;"></div>
              </div>
            </div>
          </div>

          <div class="vehicle-card-pricing">
            <span class="vehicle-est-fare">${estFare.toLocaleString()} ETB</span>
            <span class="vehicle-rate-sub">Base ${v.baseFare} ETB + ${v.perKmRate} ETB/km</span>
            <button type="button" class="vehicle-select-btn">
              ${isSelected ? '✓ Selected' : 'Select'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards
    container.querySelectorAll('.vehicle-tier-card').forEach((card) => {
      card.addEventListener('click', () => {
        const slug = (card as HTMLElement).dataset.vehicleSlug;
        if (slug) {
          this.state.vehicleTier = slug;
          this.setupVehicleSelection();
          this.updateSummaryReceipt();
          this.saveDraft();
        }
      });
    });
  }

  /* ------------------------------------------------------------
     Phase 3: Step 4 Access Details & Scheduling
     ------------------------------------------------------------ */
  private setupAccessDetailsHandlers(): void {
    // Pickup Floor & Elevator
    const pickupFloorEl = document.getElementById('pickup-floor') as HTMLSelectElement | null;
    const pickupElevatorEl = document.getElementById('pickup-elevator') as HTMLInputElement | null;
    if (pickupFloorEl) {
      pickupFloorEl.value = String(this.state.pickupFloor);
      pickupFloorEl.addEventListener('change', () => {
        this.state.pickupFloor = parseInt(pickupFloorEl.value, 10) || 0;
        this.recalculateStairsSurcharge();
      });
    }
    if (pickupElevatorEl) {
      pickupElevatorEl.checked = this.state.pickupElevator;
      pickupElevatorEl.addEventListener('change', () => {
        this.state.pickupElevator = pickupElevatorEl.checked;
        this.recalculateStairsSurcharge();
      });
    }

    // Drop-off Floor & Elevator
    const dropoffFloorEl = document.getElementById('dropoff-floor') as HTMLSelectElement | null;
    const dropoffElevatorEl = document.getElementById('dropoff-elevator') as HTMLInputElement | null;
    if (dropoffFloorEl) {
      dropoffFloorEl.value = String(this.state.dropoffFloor);
      dropoffFloorEl.addEventListener('change', () => {
        this.state.dropoffFloor = parseInt(dropoffFloorEl.value, 10) || 0;
        this.recalculateStairsSurcharge();
      });
    }
    if (dropoffElevatorEl) {
      dropoffElevatorEl.checked = this.state.dropoffElevator;
      dropoffElevatorEl.addEventListener('change', () => {
        this.state.dropoffElevator = dropoffElevatorEl.checked;
        this.recalculateStairsSurcharge();
      });
    }

    // Helpers selection cards
    const helperCards = document.querySelectorAll<HTMLElement>('[data-helper-tier]');
    helperCards.forEach((card) => {
      const tier = parseInt(card.dataset.helperTier || '1', 10);
      card.classList.toggle('is-selected', this.state.helpersCount === tier);
      card.addEventListener('click', () => {
        this.state.helpersCount = tier;
        helperCards.forEach((c) => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        this.updateSummaryReceipt();
        this.saveDraft();
      });
    });

    // Schedule Immediate vs Later
    const immediateBtn = document.getElementById('btn-sched-immediate');
    const laterBtn = document.getElementById('btn-sched-later');
    const laterFields = document.getElementById('scheduled-later-fields');

    const setScheduleMode = (immediate: boolean): void => {
      this.state.isImmediate = immediate;
      if (immediateBtn) immediateBtn.classList.toggle('is-active', immediate);
      if (laterBtn) laterBtn.classList.toggle('is-active', !immediate);
      if (laterFields) laterFields.style.display = immediate ? 'none' : 'block';
      this.saveDraft();
    };

    immediateBtn?.addEventListener('click', () => setScheduleMode(true));
    laterBtn?.addEventListener('click', () => setScheduleMode(false));
    setScheduleMode(this.state.isImmediate);

    // Time Slots
    const timeSlotBtns = document.querySelectorAll<HTMLButtonElement>('[data-time-slot]');
    timeSlotBtns.forEach((btn) => {
      const slot = btn.dataset.timeSlot;
      btn.classList.toggle('is-selected', this.state.scheduledTime === slot);
      btn.addEventListener('click', () => {
        timeSlotBtns.forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        this.state.scheduledTime = slot || '';
        this.saveDraft();
      });
    });

    // Date Input
    const dateInput = document.getElementById('scheduled-date-input') as HTMLInputElement | null;
    if (dateInput) {
      if (this.state.scheduledDate) dateInput.value = this.state.scheduledDate;
      dateInput.addEventListener('change', () => {
        this.state.scheduledDate = dateInput.value;
        this.saveDraft();
      });
    }

    // Contact Fields
    const senderNameInput = document.getElementById('sender-name') as HTMLInputElement | null;
    const senderPhoneInput = document.getElementById('sender-phone') as HTMLInputElement | null;
    const recipientNameInput = document.getElementById('recipient-name') as HTMLInputElement | null;
    const recipientPhoneInput = document.getElementById('recipient-phone') as HTMLInputElement | null;
    const notesInput = document.getElementById('special-delivery-instructions') as HTMLInputElement | null;

    if (senderNameInput) {
      if (this.state.senderName) senderNameInput.value = this.state.senderName;
      senderNameInput.addEventListener('input', () => {
        this.state.senderName = senderNameInput.value;
        this.saveDraft();
      });
    }
    if (senderPhoneInput) {
      if (this.state.senderPhone) senderPhoneInput.value = senderPhoneInput.value;
      senderPhoneInput.addEventListener('input', () => {
        this.state.senderPhone = senderPhoneInput.value;
        this.saveDraft();
      });
    }
    if (recipientNameInput) {
      if (this.state.recipientName) recipientNameInput.value = this.state.recipientName;
      recipientNameInput.addEventListener('input', () => {
        this.state.recipientName = recipientNameInput.value;
        this.saveDraft();
      });
    }
    if (recipientPhoneInput) {
      if (this.state.recipientPhone) recipientPhoneInput.value = this.state.recipientPhone;
      recipientPhoneInput.addEventListener('input', () => {
        this.state.recipientPhone = recipientPhoneInput.value;
        this.saveDraft();
      });
    }
    if (notesInput) {
      if (this.state.specialInstructions) notesInput.value = this.state.specialInstructions;
      notesInput.addEventListener('input', () => {
        this.state.specialInstructions = notesInput.value;
        this.saveDraft();
      });
    }
  }

  private recalculateStairsSurcharge(): void {
    let stairsCount = 0;
    if (!this.state.pickupElevator && this.state.pickupFloor > 2) {
      stairsCount += (this.state.pickupFloor - 2);
    }
    if (!this.state.dropoffElevator && this.state.dropoffFloor > 2) {
      stairsCount += (this.state.dropoffFloor - 2);
    }

    this.state.stairsFloors = stairsCount;
    this.state.stairsFee = stairsCount * 100;

    const stairsRow = document.getElementById('summary-stairs-row');
    const stairsFeeEl = document.getElementById('summary-stairs-fare');
    if (stairsRow && stairsFeeEl) {
      if (this.state.stairsFee > 0) {
        stairsRow.style.display = 'flex';
        stairsFeeEl.textContent = `${this.state.stairsFee.toLocaleString()} ETB`;
      } else {
        stairsRow.style.display = 'none';
      }
    }

    this.updateSummaryReceipt();
    this.saveDraft();
  }

  public updateSummaryReceipt(): void {
    const vehicle = FLEET_CATALOG.find((v) => v.vehicleTierSlug === this.state.vehicleTier) || FLEET_CATALOG[2];

    const baseFare = vehicle.baseFare;
    const distanceFee = Math.round(this.state.distanceKm * vehicle.perKmRate);
    const helperFee = this.state.helpersCount * 350;
    const stairsFee = this.state.stairsFee || 0;
    const totalFare = baseFare + distanceFee + helperFee + stairsFee;

    const routeBriefEl = document.getElementById('summary-route-brief');
    const baseFareEl = document.getElementById('summary-base-fare');
    const baseFareLbl = document.getElementById('summary-base-label');
    const distFareEl = document.getElementById('summary-distance-fare');
    const distSubtextEl = document.getElementById('summary-distance-subtext');
    const helperFareEl = document.getElementById('summary-helpers-fare');
    const helperFareLbl = document.getElementById('summary-helpers-label');
    const stairsRow = document.getElementById('summary-stairs-row');
    const stairsFeeEl = document.getElementById('summary-stairs-fare');
    const totalFareEl = document.getElementById('summary-total-fare');
    const mobileFareEl = document.getElementById('mobile-total-fare');
    const summaryCargoTally = document.getElementById('summary-cargo-tally');

    if (routeBriefEl) {
      routeBriefEl.textContent = `${this.state.origin.split(',')[0]} → ${this.state.destination.split(',')[0]}`;
    }
    if (baseFareEl) baseFareEl.textContent = `${baseFare.toLocaleString()} ETB`;
    if (baseFareLbl) baseFareLbl.textContent = `Base Fare (${vehicle.name})`;
    if (distFareEl) distFareEl.textContent = `${distanceFee.toLocaleString()} ETB`;
    if (distSubtextEl) distSubtextEl.textContent = `(${this.state.distanceKm.toFixed(1)} km × ${vehicle.perKmRate} ETB/km)`;
    if (helperFareEl) helperFareEl.textContent = `${helperFee.toLocaleString()} ETB`;
    if (helperFareLbl) {
      helperFareLbl.textContent = this.state.helpersCount === 0 ? 'Driver Assistance (Curbside)' : `Loading Labor (${this.state.helpersCount} Helper${this.state.helpersCount > 1 ? 's' : ''})`;
    }
    if (stairsRow && stairsFeeEl) {
      if (stairsFee > 0) {
        stairsRow.style.display = 'flex';
        stairsFeeEl.textContent = `${stairsFee.toLocaleString()} ETB`;
      } else {
        stairsRow.style.display = 'none';
      }
    }
    if (totalFareEl) totalFareEl.textContent = `${totalFare.toLocaleString()} ETB`;
    if (mobileFareEl) mobileFareEl.textContent = `${totalFare.toLocaleString()} ETB`;
    if (summaryCargoTally) {
      summaryCargoTally.textContent = `${this.state.totalItemsCount} items (${this.state.totalVolumeM3.toFixed(1)} m³) • ~${this.state.totalWeightKg} kg`;
    }
  }

  private onConfirmBooking(): void {
    this.openAuthGateModal();
  }

  /* ------------------------------------------------------------
     Phase 4: Step 5 Shipment Review Screen & Handlers
     ------------------------------------------------------------ */
  private setupReviewEditHandlers(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-review-edit-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.reviewEditStep || '1', 10);
        this.goToStep(step);
      });
    });

    const reviewConfirmCta = document.getElementById('btn-review-confirm-cta');
    reviewConfirmCta?.addEventListener('click', () => {
      this.openAuthGateModal();
    });
  }

  public renderReviewSummary(): void {
    // 1. Route & Timeline
    const originNameEl = document.getElementById('review-origin-name');
    const originDetailsEl = document.getElementById('review-origin-details');
    const destNameEl = document.getElementById('review-dest-name');
    const destDetailsEl = document.getElementById('review-dest-details');
    const stopsContainer = document.getElementById('review-stops-container');
    const metricDist = document.getElementById('review-metric-dist');
    const metricTime = document.getElementById('review-metric-time');
    const metricSchedule = document.getElementById('review-metric-schedule');

    if (originNameEl) originNameEl.textContent = this.state.origin;
    if (originDetailsEl) {
      const elevatorText = this.state.pickupElevator ? 'Elevator available' : 'Stairs only';
      const floorText = this.state.pickupFloor === 0 ? 'Ground Floor' : `${this.state.pickupFloor}th Floor`;
      originDetailsEl.textContent = `Pickup Spot • ${floorText} (${elevatorText})`;
    }

    if (destNameEl) destNameEl.textContent = this.state.destination;
    if (destDetailsEl) {
      const elevatorText = this.state.dropoffElevator ? 'Elevator available' : 'Stairs only';
      const floorText = this.state.dropoffFloor === 0 ? 'Ground Floor' : `${this.state.dropoffFloor}th Floor`;
      destDetailsEl.textContent = `Drop-off Spot • ${floorText} (${elevatorText})`;
    }

    if (stopsContainer) {
      if (this.state.stops.length > 0) {
        stopsContainer.innerHTML = this.state.stops
          .map(
            (stop, idx) => `
          <div class="review-point-item" style="margin: 0.5rem 0;">
            <div class="review-point-dot is-stop"></div>
            <div class="review-point-name">Stop ${idx + 1}: ${stop || 'Intermediate Stop'}</div>
            <div class="review-point-details">Route waypoint loading/drop</div>
          </div>
        `
          )
          .join('');
      } else {
        stopsContainer.innerHTML = '';
      }
    }

    if (metricDist) metricDist.textContent = `${this.state.distanceKm.toFixed(1)} km`;
    if (metricTime) metricTime.textContent = `${this.state.durationMins} min`;
    if (metricSchedule) {
      if (this.state.isImmediate) {
        metricSchedule.textContent = 'Immediate Pickup (~30-45 min)';
      } else {
        const dateStr = this.state.scheduledDate || 'Tomorrow';
        const timeStr = this.state.scheduledTime ? `${this.state.scheduledTime} window` : 'Flexible';
        metricSchedule.textContent = `Scheduled: ${dateStr} • ${timeStr}`;
      }
    }

    // 2. Cargo Manifest
    const totalCountEl = document.getElementById('review-cargo-total-count');
    const totalVolEl = document.getElementById('review-cargo-total-vol');
    const totalWeightEl = document.getElementById('review-cargo-total-weight');
    const chipsContainer = document.getElementById('review-cargo-chips');
    const handlingTagsEl = document.getElementById('review-handling-tags');
    const photosStrip = document.getElementById('review-photos-strip');

    if (totalCountEl) totalCountEl.textContent = `${this.state.totalItemsCount} items selected`;
    if (totalVolEl) totalVolEl.textContent = `${this.state.totalVolumeM3.toFixed(1)} m³ Total`;
    if (totalWeightEl) totalWeightEl.textContent = `~${this.state.totalWeightKg.toLocaleString()} kg Gross`;

    if (chipsContainer) {
      const standardChips = Object.entries(this.state.cargoInventory)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const item = CARGO_CATALOG.find((c) => c.id === id);
          return `<span class="review-cargo-chip"><span>${item?.icon || '📦'}</span> ${item?.name || id} <strong>×${qty}</strong></span>`;
        });

      const customChips = this.state.customItems.map(
        (c) => `<span class="review-cargo-chip"><span>✨</span> ${c.name} <strong>×${c.quantity}</strong></span>`
      );

      const allChips = [...standardChips, ...customChips];
      if (allChips.length > 0) {
        chipsContainer.innerHTML = allChips.join('');
      } else {
        chipsContainer.innerHTML = `<span style="font-size:0.8125rem; color:#71717A;">General Cargo Package (Standard transport)</span>`;
      }
    }

    if (handlingTagsEl) {
      const tags: string[] = [];
      if (this.state.isFragile) {
        tags.push(`<span class="review-tag-badge is-fragile">⚠️ Fragile Cargo</span>`);
      }
      if (this.state.isHeavy) {
        tags.push(`<span class="review-tag-badge is-heavy">🏋️ Heavy Load (&gt;50kg)</span>`);
      }
      if (this.state.isWeatherSensitive) {
        tags.push(`<span class="review-tag-badge is-weather">🌧️ Weather Protected</span>`);
      }
      handlingTagsEl.innerHTML = tags.join('');
    }

    if (photosStrip) {
      if (this.state.cargoPhotos.length > 0) {
        photosStrip.innerHTML = this.state.cargoPhotos
          .map((src, i) => `<div class="photo-thumb-card"><img src="${src}" alt="Cargo photo ${i + 1}" class="photo-thumb-img" /></div>`)
          .join('');
      } else {
        photosStrip.innerHTML = '';
      }
    }

    // 3. Assigned Vehicle
    const vehicle = FLEET_CATALOG.find((v) => v.vehicleTierSlug === this.state.vehicleTier) || FLEET_CATALOG[2];
    const vehicleImg = document.getElementById('review-vehicle-img') as HTMLImageElement | null;
    const vehicleNameEl = document.getElementById('review-vehicle-name');
    const vehicleBadgeEl = document.getElementById('review-vehicle-badge');
    const vehicleModelEl = document.getElementById('review-vehicle-model');
    const vehiclePayloadEl = document.getElementById('review-vehicle-payload');
    const vehicleDimsEl = document.getElementById('review-vehicle-dims');
    const vehicleVolEl = document.getElementById('review-vehicle-vol');
    const vehicleUtilEl = document.getElementById('review-vehicle-util-pct');

    if (vehicleImg) {
      let imageSrc = '/images/bedford-kb26.png';
      if (vehicle.vehicleTierSlug === 'cargo-van') imageSrc = '/images/delivery-van.jpg';
      if (vehicle.vehicleTierSlug === 'medium-truck') imageSrc = '/images/box-truck.jpg';
      if (vehicle.vehicleTierSlug === 'large-truck') imageSrc = '/images/fleet-heavy-dumper.svg';
      vehicleImg.src = imageSrc;
      vehicleImg.alt = vehicle.name;
    }
    if (vehicleNameEl) vehicleNameEl.textContent = vehicle.name;
    if (vehicleBadgeEl) {
      vehicleBadgeEl.textContent = vehicle.badge || 'VERIFIED FLEET';
      vehicleBadgeEl.style.display = 'inline-block';
    }
    if (vehicleModelEl) vehicleModelEl.textContent = vehicle.modelName;
    if (vehiclePayloadEl) vehiclePayloadEl.innerHTML = `⚖️ ${vehicle.payload}`;
    if (vehicleDimsEl) vehicleDimsEl.innerHTML = `📐 ${vehicle.dimensions}`;
    if (vehicleVolEl) vehicleVolEl.innerHTML = `📦 ${vehicle.volume}`;

    const vehicleVolumes: Record<string, number> = {
      'small-pickup': 5.2,
      'cargo-van': 9.2,
      'medium-truck': 18.5,
      'large-truck': 18.0
    };
    const maxVol = vehicleVolumes[vehicle.vehicleTierSlug] || 15.0;
    const fillPercent = Math.min(100, Math.round((this.state.totalVolumeM3 / maxVol) * 100));
    if (vehicleUtilEl) vehicleUtilEl.textContent = `${fillPercent}%`;

    // 4. Loading Labor & Contacts
    const laborDescEl = document.getElementById('review-labor-tier-desc');
    const senderNameEl = document.getElementById('review-sender-name');
    const senderPhoneEl = document.getElementById('review-sender-phone');
    const recipientNameEl = document.getElementById('review-recipient-name');
    const recipientPhoneEl = document.getElementById('review-recipient-phone');
    const specialNotesEl = document.getElementById('review-special-notes');

    if (laborDescEl) {
      if (this.state.helpersCount === 0) {
        laborDescEl.textContent = 'Driver Only (Curbside tailgate loading)';
      } else if (this.state.helpersCount === 1) {
        laborDescEl.textContent = 'Driver + 1 Helper (Dedicated porter assistance into rooms & staircases)';
      } else {
        laborDescEl.textContent = 'Driver + 2 Helpers (Two porters for heavy furniture & multi-flight stairs)';
      }
    }

    if (senderNameEl) senderNameEl.textContent = this.state.senderName || 'Dawit Haile';
    if (senderPhoneEl) senderPhoneEl.textContent = this.state.senderPhone || '0911234567';
    if (recipientNameEl) recipientNameEl.textContent = this.state.recipientName || 'Meron Tadesse';
    if (recipientPhoneEl) recipientPhoneEl.textContent = this.state.recipientPhone || '0922345678';
    if (specialNotesEl) specialNotesEl.textContent = this.state.specialInstructions || 'Standard delivery. Call upon arrival.';

    // 5. Pricing Breakdown
    const baseFare = vehicle.baseFare;
    const distanceFee = Math.round(this.state.distanceKm * vehicle.perKmRate);
    const helperFee = this.state.helpersCount * 350;
    const stairsFee = this.state.stairsFee || 0;
    const totalFare = baseFare + distanceFee + helperFee + stairsFee;

    const baseLbl = document.getElementById('review-price-base-lbl');
    const baseVal = document.getElementById('review-price-base-val');
    const distSub = document.getElementById('review-price-dist-sub');
    const distVal = document.getElementById('review-price-dist-val');
    const helperLbl = document.getElementById('review-price-helper-lbl');
    const helperVal = document.getElementById('review-price-helper-val');
    const stairsRow = document.getElementById('review-price-stairs-row');
    const stairsVal = document.getElementById('review-price-stairs-val');
    const totalVal = document.getElementById('review-price-total-val');

    if (baseLbl) baseLbl.textContent = `Base Fare (${vehicle.name})`;
    if (baseVal) baseVal.textContent = `${baseFare.toLocaleString()} ETB`;
    if (distSub) distSub.textContent = `(${this.state.distanceKm.toFixed(1)} km × ${vehicle.perKmRate} ETB/km)`;
    if (distVal) distVal.textContent = `${distanceFee.toLocaleString()} ETB`;
    if (helperLbl) {
      helperLbl.textContent = this.state.helpersCount === 0 ? 'Driver Assistance (Tailgate)' : `Loading Assistance (${this.state.helpersCount} Helper${this.state.helpersCount > 1 ? 's' : ''})`;
    }
    if (helperVal) helperVal.textContent = `${helperFee.toLocaleString()} ETB`;

    if (stairsRow && stairsVal) {
      if (stairsFee > 0) {
        stairsRow.style.display = 'flex';
        stairsVal.textContent = `${stairsFee.toLocaleString()} ETB`;
      } else {
        stairsRow.style.display = 'none';
      }
    }
    if (totalVal) totalVal.textContent = `${totalFare.toLocaleString()} ETB`;
  }

  /* ------------------------------------------------------------
     Phase 4: Screen 6 Auth Gate Modal & Phone OTP Verification
     ------------------------------------------------------------ */
  public openAuthGateModal(): void {
    const modal = document.getElementById('auth-gate-modal');
    if (!modal) return;

    // Pre-fill sender info
    const nameInput = document.getElementById('auth-gate-name-input') as HTMLInputElement | null;
    const phoneInput = document.getElementById('auth-gate-phone-input') as HTMLInputElement | null;
    if (nameInput) nameInput.value = this.state.senderName || 'Dawit Haile';
    if (phoneInput) phoneInput.value = this.state.senderPhone || '0911234567';

    // Reset steps
    const stepPhone = document.getElementById('auth-modal-step-phone');
    const stepOtp = document.getElementById('auth-modal-step-otp');
    const stepSuccess = document.getElementById('auth-modal-step-success');
    if (stepPhone) stepPhone.style.display = 'block';
    if (stepOtp) stepOtp.style.display = 'none';
    if (stepSuccess) stepSuccess.style.display = 'none';

    modal.classList.add('is-open');
  }

  public closeAuthGateModal(): void {
    const modal = document.getElementById('auth-gate-modal');
    if (modal) modal.classList.remove('is-open');
  }

  private otpTimerInterval: number | null = null;

  private setupAuthGateModal(): void {
    const backdrop = document.getElementById('auth-gate-backdrop');
    const closeBtn = document.getElementById('btn-close-auth-modal');
    const sendOtpBtn = document.getElementById('btn-auth-gate-send-otp');
    const verifyOtpBtn = document.getElementById('btn-auth-gate-verify-otp');
    const otpAutofillBtn = document.getElementById('btn-auth-otp-autofill');
    const phoneAutofillBtn = document.getElementById('btn-auth-phone-autofill');
    const otpBackBtn = document.getElementById('btn-auth-otp-back');
    const resendBtn = document.getElementById('btn-auth-resend-otp');

    closeBtn?.addEventListener('click', () => this.closeAuthGateModal());
    backdrop?.addEventListener('click', () => this.closeAuthGateModal());

    // Phone autofill demo button
    phoneAutofillBtn?.addEventListener('click', () => {
      const phoneInput = document.getElementById('auth-gate-phone-input') as HTMLInputElement | null;
      if (phoneInput) phoneInput.value = '0911234567';
    });

    // Send OTP handler
    sendOtpBtn?.addEventListener('click', () => {
      const phoneInput = document.getElementById('auth-gate-phone-input') as HTMLInputElement | null;
      const nameInput = document.getElementById('auth-gate-name-input') as HTMLInputElement | null;
      const rawPhone = phoneInput ? phoneInput.value.trim() : '';

      if (!rawPhone || rawPhone.length < 9) {
        alert('Please enter a valid Ethiopian mobile number (e.g. 0911234567).');
        return;
      }

      this.state.senderPhone = rawPhone;
      if (nameInput) this.state.senderName = nameInput.value.trim();
      this.saveDraft();

      // Show OTP Step
      const stepPhone = document.getElementById('auth-modal-step-phone');
      const stepOtp = document.getElementById('auth-modal-step-otp');
      const targetPhoneEl = document.getElementById('auth-gate-phone-target');

      if (targetPhoneEl) {
        let clean = rawPhone.replace(/\s+/g, '');
        if (clean.startsWith('+251')) clean = clean.substring(4);
        if (clean.startsWith('251')) clean = clean.substring(3);
        if (clean.startsWith('0')) clean = clean.substring(1);
        targetPhoneEl.textContent = `+251 ${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
      }

      if (stepPhone) stepPhone.style.display = 'none';
      if (stepOtp) stepOtp.style.display = 'block';

      this.startOtpTimer();
      const firstDigit = document.querySelector<HTMLInputElement>('.auth-gate-otp-digit[data-otp-index="0"]');
      firstDigit?.focus();
    });

    // OTP Digits navigation
    const digits = document.querySelectorAll<HTMLInputElement>('.auth-gate-otp-digit');
    digits.forEach((digit, idx) => {
      digit.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value;
        if (val && idx < digits.length - 1) {
          digits[idx + 1].focus();
        }
      });

      digit.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !digit.value && idx > 0) {
          digits[idx - 1].focus();
        }
      });
    });

    // OTP Demo Autofill
    otpAutofillBtn?.addEventListener('click', () => {
      const sample = ['1', '2', '3', '4', '5', '6'];
      digits.forEach((d, i) => {
        d.value = sample[i];
      });
      digits[digits.length - 1].focus();
    });

    // OTP Back button
    otpBackBtn?.addEventListener('click', () => {
      const stepPhone = document.getElementById('auth-modal-step-phone');
      const stepOtp = document.getElementById('auth-modal-step-otp');
      if (stepPhone) stepPhone.style.display = 'block';
      if (stepOtp) stepOtp.style.display = 'none';
    });

    // Resend OTP
    resendBtn?.addEventListener('click', () => {
      this.startOtpTimer();
      alert('A new SMS verification code has been dispatched.');
    });

    // Verify OTP and complete booking
    verifyOtpBtn?.addEventListener('click', () => {
      let code = '';
      digits.forEach((d) => {
        code += d.value.trim();
      });

      if (code.length < 6) {
        alert('Please enter all 6 digits of the verification code.');
        return;
      }

      // Persist authenticated customer profile
      const userProfile = {
        name: this.state.senderName || 'Dawit Haile',
        phone: this.state.senderPhone || '0911234567',
        verified: true,
        verifiedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem('kuli_auth_user', JSON.stringify(userProfile));
      } catch {
        // storage disabled
      }

      // Transition to success state
      const randomRef = `KL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const stepOtp = document.getElementById('auth-modal-step-otp');
      const stepSuccess = document.getElementById('auth-modal-step-success');
      const refEl = document.getElementById('auth-confirmed-ref');

      if (refEl) refEl.textContent = randomRef;
      if (stepOtp) stepOtp.style.display = 'none';
      if (stepSuccess) stepSuccess.style.display = 'block';

      // Save final draft
      this.saveDraft();

      setTimeout(() => {
        window.location.href = `/tracking.html?ref=${randomRef}`;
      }, 1400);
    });
  }

  private startOtpTimer(): void {
    let timeLeft = 45;
    const timerEl = document.getElementById('auth-otp-timer');
    const resendBtn = document.getElementById('btn-auth-resend-otp') as HTMLButtonElement | null;

    if (this.otpTimerInterval) {
      window.clearInterval(this.otpTimerInterval);
    }
    if (resendBtn) resendBtn.disabled = true;

    this.otpTimerInterval = window.setInterval(() => {
      timeLeft -= 1;
      if (timerEl) timerEl.textContent = String(timeLeft);
      if (timeLeft <= 0) {
        if (this.otpTimerInterval) window.clearInterval(this.otpTimerInterval);
        if (resendBtn) resendBtn.disabled = false;
      }
    }, 1000);
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
