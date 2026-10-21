/* ============================================================
   Kulli Logistics Platform — Client-Side Booking Flow Controller
   Multi-Step Wizard, Autocomplete, Nextories Cargo Inventory & Calc
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
      isImmediate: true,
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
      inventorySearchQuery: ''
    };

    // Ensure cargo collections are initialized
    if (!this.state.cargoInventory) this.state.cargoInventory = {};
    if (!this.state.customItems) this.state.customItems = [];
    if (!this.state.cargoPhotos) this.state.cargoPhotos = [];
    if (!this.state.activeCategory) this.state.activeCategory = 'all';
    if (!this.state.inventorySearchQuery) this.state.inventorySearchQuery = '';
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
    this.updateInventoryTotals();
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
      summaryCargoTally.textContent = `${totalCount} items (${this.state.totalVolumeM3.toFixed(1)} m³)`;
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

  public updateSummaryReceipt(): void {
    const vehicle = FLEET_CATALOG.find((v) => v.vehicleTierSlug === this.state.vehicleTier) || FLEET_CATALOG[2];

    const baseFare = vehicle.baseFare;
    const distanceFee = Math.round(this.state.distanceKm * vehicle.perKmRate);
    const helperFee = this.state.helpersCount * 350;
    const stairsFee = this.state.stairsFloors * 100;
    const totalFare = baseFare + distanceFee + helperFee + stairsFee;

    const routeBriefEl = document.getElementById('summary-route-brief');
    const baseFareEl = document.getElementById('summary-base-fare');
    const distFareEl = document.getElementById('summary-distance-fare');
    const distSubtextEl = document.getElementById('summary-distance-subtext');
    const helperFareEl = document.getElementById('summary-helpers-fare');
    const totalFareEl = document.getElementById('summary-total-fare');
    const mobileFareEl = document.getElementById('mobile-total-fare');
    const summaryCargoTally = document.getElementById('summary-cargo-tally');

    if (routeBriefEl) {
      routeBriefEl.textContent = `${this.state.origin.split(',')[0]} → ${this.state.destination.split(',')[0]}`;
    }
    if (baseFareEl) baseFareEl.textContent = `${baseFare.toLocaleString()} ETB`;
    if (distFareEl) distFareEl.textContent = `${distanceFee.toLocaleString()} ETB`;
    if (distSubtextEl) distSubtextEl.textContent = `(${this.state.distanceKm.toFixed(1)} km × ${vehicle.perKmRate} ETB/km)`;
    if (helperFareEl) helperFareEl.textContent = `${helperFee.toLocaleString()} ETB`;
    if (totalFareEl) totalFareEl.textContent = `${totalFare.toLocaleString()} ETB`;
    if (mobileFareEl) mobileFareEl.textContent = `${totalFare.toLocaleString()} ETB`;
    if (summaryCargoTally) {
      summaryCargoTally.textContent = `${this.state.totalItemsCount} items (${this.state.totalVolumeM3.toFixed(1)} m³) • ~${this.state.totalWeightKg} kg`;
    }
  }

  private onConfirmBooking(): void {
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
