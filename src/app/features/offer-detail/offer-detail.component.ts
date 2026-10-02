import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { OfferService } from '../../core/offers/offer.service';

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

  readonly data = signal<OfferData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const offerId = this.route.snapshot.paramMap.get('offerId');

    if (!offerId) {
      this.errorMessage.set('Tilbuddet blev ikke fundet.');

      this.isLoading.set(false);
      return;
    }

    void this.loadOffer(offerId);
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

  backToProject(): void {
    const offer = this.data()?.offer;

    if (!offer?.project_id) {
      return;
    }

    void this.router.navigate(['/projects', offer.project_id], {
      queryParams: {
        tab: 'offers',
      },
    });
  }
}
