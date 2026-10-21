import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { OfferService } from '../../core/offers/offer.service';
import { OfferPdfService } from '../../core/offers/offer-pdf.service';
import { OFFER_STATUSES, OfferStatus, offerStatusLabel } from '../../core/offers/offer-status';

type OfferData = Awaited<ReturnType<OfferService['getOffer']>>;

@Component({
  selector: 'app-offer-detail',
  imports: [DecimalPipe, DatePipe],
  templateUrl: './offer-detail.component.html',
  styleUrl: './offer-detail.component.scss',
})
export class OfferDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly offerService = inject(OfferService);
  private readonly offerPdfService = inject(OfferPdfService);

  readonly data = signal<OfferData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly isDownloadingPdf = signal(false);
  readonly pdfError = signal('');
  readonly statusOptions = OFFER_STATUSES;
  readonly statusLabel = offerStatusLabel;
  readonly isSavingStatus = signal(false);
  readonly statusError = signal('');
  readonly statusMessage = signal('');

  async changeStatus(select: HTMLSelectElement): Promise<void> {
    const value = select.value;
    await this.updateStatus(value);
    select.value = this.data()?.offer.status ?? '';
  }

  async updateStatus(value: string): Promise<void> {
    const data = this.data();
    if (!data || this.isSavingStatus() || value === data.offer.status ||
      !OFFER_STATUSES.some((option) => option.value === value)) {
      return;
    }

    this.isSavingStatus.set(true);
    this.statusError.set('');
    this.statusMessage.set('');
    try {
      const offer = await this.offerService.updateStatus(data.offer.id, data.offer.status, value as OfferStatus);
      this.data.set({ ...data, offer });
      this.statusMessage.set(`Status gemt: ${offerStatusLabel(offer.status)}.`);
    } catch (error) {
      this.statusError.set(error instanceof Error ? error.message : 'Kunne ikke gemme status.');
    } finally {
      this.isSavingStatus.set(false);
    }
  }

  ngOnInit(): void {
    const offerId = this.route.snapshot.paramMap.get('offerId');

    if (!offerId) {
      this.errorMessage.set('Tilbuddet blev ikke fundet.');
      this.isLoading.set(false);
      return;
    }

    void this.loadOffer(offerId);
  }

  retryOffer(): void {
    const offerId = this.route.snapshot.paramMap.get('offerId');
    if (offerId && !this.isLoading()) void this.loadOffer(offerId);
  }

  async loadOffer(offerId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const data = await this.offerService.getOffer(offerId);
      this.data.set(data);
    } catch (error) {
      console.error('Could not load offer:', error);
      this.errorMessage.set('Kunne ikke hente tilbuddet.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async downloadPdf(): Promise<void> {
    const data = this.data();

    if (!data || this.isDownloadingPdf()) {
      return;
    }

    this.isDownloadingPdf.set(true);
    this.pdfError.set('');

    try {
      await this.offerPdfService.download(data);
    } catch (error) {
      console.error('Could not generate PDF:', error);
      this.pdfError.set('Kunne ikke generere PDF-filen.');
    } finally {
      this.isDownloadingPdf.set(false);
    }
  }

  backToProject(): void {
    const offer = this.data()?.offer;

    if (!offer?.project_id) {
      void this.router.navigate(['/projects']);
      return;
    }

    void this.router.navigate(['/projects', offer.project_id], {
      queryParams: {
        tab: 'offers',
      },
    });
  }
}
