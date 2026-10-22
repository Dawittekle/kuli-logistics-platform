/**
 * Kulli Logistics Platform — Customer Shipment Tracking Controller
 * Interactive real-time driver dispatch, animated route map, and status simulator
 */

import { FLEET_CATALOG } from '../data/fleet-catalog';

export interface TrackingOrder {
  ref: string;
  createdAt: string;
  origin: string;
  destination: string;
  distanceKm: number;
  durationMins: number;
  vehicleTier: string;
  vehicleName: string;
  modelName: string;
  helpersCount: number;
  totalFare: number;
  totalItemsCount: number;
  totalVolumeM3: number;
  totalWeightKg: number;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  specialInstructions?: string;
}

export const STATUS_STAGES = [
  {
    step: 1,
    title: 'Booking Request Received',
    desc: 'Shipment registered in Kulli central dispatch system.',
    badge: '📋 Request Logged',
    etaText: 'Matching drivers...',
    truckPercent: 10
  },
  {
    step: 2,
    title: 'Driver Assigned & Confirmed',
    desc: 'Abebe Tadesse accepted dispatch with Isuzu NPR truck.',
    badge: '⚡ Driver Assigned',
    etaText: '~25 min away',
    truckPercent: 25
  },
  {
    step: 3,
    title: 'Driver En Route to Pickup',
    desc: 'Vehicle moving along airport corridor towards Bole pickup point.',
    badge: '🚚 En Route to Pickup',
    etaText: '~12 min to arrival',
    truckPercent: 45
  },
  {
    step: 4,
    title: 'Loading & Cargo Inspection',
    desc: 'Porters loading and securing goods with heavy-duty tie-down straps.',
    badge: '📦 Loading at Origin',
    etaText: 'Loading in progress',
    truckPercent: 60
  },
  {
    step: 5,
    title: 'In Transit to Destination',
    desc: 'Shipment traveling along arterial ring road towards Merkato.',
    badge: '🛣️ In Transit',
    etaText: '~15 min to drop-off',
    truckPercent: 82
  },
  {
    step: 6,
    title: 'Delivered & Confirmed',
    desc: 'Goods unloaded safely. Final cash / Telebirr settlement complete.',
    badge: '✅ Delivery Completed',
    etaText: 'Delivered at destination',
    truckPercent: 100
  }
];

export class TrackingController {
  private currentStep = 2; // Default starting state: Driver Assigned
  private isAutoPlaying = false;
  private autoPlayTimer: number | null = null;
  private order: TrackingOrder;

  constructor() {
    this.order = this.resolveOrderData();
  }

  public init(): void {
    this.renderHeaderDetails();
    this.renderOrderManifest();
    this.renderDriverCard();
    this.setupSimulationControls();
    this.setupCopyButton();
    this.setupChatModal();
    this.updateStatus(this.currentStep);
  }

  private resolveOrderData(): TrackingOrder {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref') || `KL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Attempt to load from localStorage draft
    try {
      const rawDraft = localStorage.getItem('kuli_booking_draft_v1');
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        const vehicle = FLEET_CATALOG.find((v) => v.vehicleTierSlug === draft.vehicleTier) || FLEET_CATALOG[2];
        const dist = draft.distanceKm || 14.8;
        const helpers = draft.helpersCount !== undefined ? draft.helpersCount : 1;
        const stairsFee = draft.stairsFee || 0;
        const total = vehicle.baseFare + Math.round(dist * vehicle.perKmRate) + (helpers * 350) + stairsFee;

        return {
          ref: refParam,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          origin: draft.origin || 'Bole Medhanialem, Addis Ababa',
          destination: draft.destination || 'Merkato Wholesale District, Addis Ababa',
          distanceKm: dist,
          durationMins: draft.durationMins || 32,
          vehicleTier: draft.vehicleTier || 'medium-truck',
          vehicleName: vehicle.name,
          modelName: vehicle.modelName,
          helpersCount: helpers,
          totalFare: total,
          totalItemsCount: draft.totalItemsCount || 13,
          totalVolumeM3: draft.totalVolumeM3 || 5.8,
          totalWeightKg: draft.totalWeightKg || 305,
          senderName: draft.senderName || 'Dawit Haile',
          senderPhone: draft.senderPhone || '0911234567',
          recipientName: draft.recipientName || 'Meron Tadesse',
          recipientPhone: draft.recipientPhone || '0922345678',
          specialInstructions: draft.specialInstructions
        };
      }
    } catch {
      // Fallback
    }

    // Default canonical scenario
    return {
      ref: refParam,
      createdAt: '10:45 AM',
      origin: 'Bole Medhanialem, Addis Ababa',
      destination: 'Merkato Wholesale District, Addis Ababa',
      distanceKm: 14.8,
      durationMins: 32,
      vehicleTier: 'medium-truck',
      vehicleName: 'Medium Flatbed / Box Truck',
      modelName: 'Isuzu NPR / Mitsubishi Canter',
      helpersCount: 1,
      totalFare: 2660,
      totalItemsCount: 13,
      totalVolumeM3: 5.8,
      totalWeightKg: 305,
      senderName: 'Dawit Haile',
      senderPhone: '0911234567',
      recipientName: 'Meron Tadesse',
      recipientPhone: '0922345678'
    };
  }

  private renderHeaderDetails(): void {
    const refBadge = document.getElementById('tracking-order-ref');
    const heroRef = document.getElementById('hero-order-ref');
    const originBrief = document.getElementById('tracking-origin-brief');
    const destBrief = document.getElementById('tracking-dest-brief');

    if (refBadge) refBadge.textContent = this.order.ref;
    if (heroRef) heroRef.textContent = this.order.ref;
    if (originBrief) originBrief.textContent = this.order.origin.split(',')[0];
    if (destBrief) destBrief.textContent = this.order.destination.split(',')[0];
  }

  private renderOrderManifest(): void {
    const cargoTally = document.getElementById('manifest-cargo-tally');
    const totalFareEl = document.getElementById('manifest-total-fare');
    const vehicleText = document.getElementById('manifest-vehicle-text');
    const laborText = document.getElementById('manifest-labor-text');
    const contactsText = document.getElementById('manifest-contacts-text');

    if (cargoTally) {
      cargoTally.textContent = `${this.order.totalItemsCount} items (${this.order.totalVolumeM3.toFixed(1)} m³) • ~${this.order.totalWeightKg} kg`;
    }
    if (totalFareEl) {
      totalFareEl.textContent = `${this.order.totalFare.toLocaleString()} ETB`;
    }
    if (vehicleText) {
      vehicleText.textContent = `${this.order.vehicleName} (${this.order.modelName})`;
    }
    if (laborText) {
      laborText.textContent = this.order.helpersCount === 0
        ? 'Driver Only (Curbside tailgate)'
        : `Driver + ${this.order.helpersCount} Helper${this.order.helpersCount > 1 ? 's' : ''}`;
    }
    if (contactsText) {
      contactsText.textContent = `${this.order.senderName} (${this.order.senderPhone}) → ${this.order.recipientName} (${this.order.recipientPhone})`;
    }
  }

  private renderDriverCard(): void {
    const driverPhoneBtn = document.getElementById('btn-call-driver') as HTMLAnchorElement | null;
    if (driverPhoneBtn) {
      driverPhoneBtn.href = `tel:+251911482910`;
    }
  }

  public updateStatus(stepIndex: number): void {
    if (stepIndex < 1) stepIndex = 1;
    if (stepIndex > 6) stepIndex = 6;
    this.currentStep = stepIndex;

    const currentStage = STATUS_STAGES[stepIndex - 1];

    // Status Pill
    const badge = document.getElementById('tracking-status-badge');
    if (badge) {
      badge.textContent = currentStage.badge;
      badge.className = 'tracking-status-pill';
      if (stepIndex === 6) {
        badge.style.background = '#DCFCE7';
        badge.style.color = '#15803D';
      } else {
        badge.style.background = '#FEF3C7';
        badge.style.color = '#B45309';
      }
    }

    // ETA display in map
    const etaEl = document.getElementById('tracking-eta-val');
    if (etaEl) {
      etaEl.textContent = currentStage.etaText;
    }

    // Step items UI
    for (let i = 1; i <= 6; i++) {
      const stepEl = document.getElementById(`tracking-step-${i}`);
      if (stepEl) {
        stepEl.classList.toggle('is-done', i < stepIndex);
        stepEl.classList.toggle('is-active', i === stepIndex);
        stepEl.style.opacity = i <= stepIndex ? '1' : '0.45';

        const node = stepEl.querySelector('.tracking-step-node');
        if (node) {
          if (i < stepIndex) {
            node.textContent = '✓';
          } else if (i === stepIndex) {
            node.textContent = '●';
          } else {
            node.textContent = String(i);
          }
        }
      }
    }

    // Progress bar height
    const progressFill = document.getElementById('timeline-progress-fill');
    if (progressFill) {
      const pct = Math.round(((stepIndex - 1) / 5) * 100);
      progressFill.style.height = `${Math.max(10, pct)}%`;
    }

    // Map Truck Marker SVG Position
    this.updateMapTruckPosition(currentStage.truckPercent);
  }

  private updateMapTruckPosition(pct: number): void {
    // Coordinate interpolation along the curve M 100 240 Q 250 140 400 80
    // Quadratic Bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const t = pct / 100;
    const p0 = { x: 100, y: 240 };
    const p1 = { x: 250, y: 140 };
    const p2 = { x: 400, y: 80 };

    const x = Math.round((1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x);
    const y = Math.round((1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y);

    const markerGroup = document.getElementById('map-truck-marker-group');
    if (markerGroup) {
      markerGroup.setAttribute('transform', `translate(${x}, ${y})`);
    }
  }

  private setupSimulationControls(): void {
    const prevBtn = document.getElementById('btn-sim-prev');
    const nextBtn = document.getElementById('btn-sim-next');
    const autoBtn = document.getElementById('btn-sim-autoplay');
    const resetBtn = document.getElementById('btn-sim-reset');

    prevBtn?.addEventListener('click', () => {
      this.pauseAutoPlay();
      this.updateStatus(this.currentStep - 1);
    });

    nextBtn?.addEventListener('click', () => {
      this.pauseAutoPlay();
      this.updateStatus(this.currentStep + 1);
    });

    autoBtn?.addEventListener('click', () => {
      if (this.isAutoPlaying) {
        this.pauseAutoPlay();
      } else {
        this.startAutoPlay();
      }
    });

    resetBtn?.addEventListener('click', () => {
      this.pauseAutoPlay();
      this.updateStatus(2); // Reset to Driver Assigned
    });
  }

  private startAutoPlay(): void {
    this.isAutoPlaying = true;
    const autoBtn = document.getElementById('btn-sim-autoplay');
    if (autoBtn) {
      autoBtn.textContent = '⏸️ Pause Simulation';
      autoBtn.classList.add('is-primary');
    }

    if (this.autoPlayTimer) window.clearInterval(this.autoPlayTimer);
    this.autoPlayTimer = window.setInterval(() => {
      if (this.currentStep < 6) {
        this.updateStatus(this.currentStep + 1);
      } else {
        this.updateStatus(1);
      }
    }, 2800);
  }

  private pauseAutoPlay(): void {
    this.isAutoPlaying = false;
    if (this.autoPlayTimer) {
      window.clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    const autoBtn = document.getElementById('btn-sim-autoplay');
    if (autoBtn) {
      autoBtn.textContent = '⚡ Auto-Play Sim';
      autoBtn.classList.remove('is-primary');
    }
  }

  private setupCopyButton(): void {
    const copyBtn = document.getElementById('btn-copy-ref');
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard?.writeText(this.order.ref).then(() => {
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = '📋 Copy';
        }, 2000);
      });
    });
  }

  private setupChatModal(): void {
    const modal = document.getElementById('driver-chat-modal');
    const openBtn = document.getElementById('btn-open-chat');
    const closeBtn = document.getElementById('btn-close-chat');
    const backdrop = document.getElementById('chat-backdrop');
    const sendBtn = document.getElementById('btn-send-chat');
    const input = document.getElementById('chat-input') as HTMLInputElement | null;
    const messagesBody = document.getElementById('chat-messages-body');

    const openChat = (): void => modal?.classList.add('is-open');
    const closeChat = (): void => modal?.classList.remove('is-open');

    openBtn?.addEventListener('click', openChat);
    closeBtn?.addEventListener('click', closeChat);
    backdrop?.addEventListener('click', closeChat);

    const appendMessage = (text: string, isUser: boolean): void => {
      if (!messagesBody) return;
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${isUser ? 'from-user' : 'from-driver'}`;
      bubble.textContent = text;
      messagesBody.appendChild(bubble);
      messagesBody.scrollTop = messagesBody.scrollHeight;
    };

    const handleSendMessage = (): void => {
      if (!input) return;
      const val = input.value.trim();
      if (!val) return;
      appendMessage(val, true);
      input.value = '';

      // Simulated driver auto-response after 900ms
      setTimeout(() => {
        const responses = [
          'Received! I am navigating towards the location now.',
          'Understood, thank you. I will call you 5 minutes before arrival.',
          'Perfect, our helper has the straps and moving blankets ready.'
        ];
        const randomResp = responses[Math.floor(Math.random() * responses.length)];
        appendMessage(randomResp, false);
      }, 900);
    };

    sendBtn?.addEventListener('click', handleSendMessage);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });

    // Quick replies
    document.querySelectorAll<HTMLButtonElement>('.btn-quick-reply').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (input) {
          input.value = btn.textContent || '';
          handleSendMessage();
        }
      });
    });
  }
}

// Auto-initialize on tracking page
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const tracker = new TrackingController();
      tracker.init();
    });
  } else {
    const tracker = new TrackingController();
    tracker.init();
  }
}
