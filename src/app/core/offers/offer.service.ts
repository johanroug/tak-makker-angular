import { Injectable } from '@angular/core';

import { supabase } from '../supabase/supabase.client';

@Injectable({
  providedIn: 'root',
})
export class OfferService {
  async getOffer(offerId: string) {
    const [
      offerResult,
      workItemsResult,
      materialsResult,
    ] = await Promise.all([
      supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .single(),

      supabase
        .from('offer_work_items')
        .select('*')
        .eq('offer_id', offerId),

      supabase
        .from('offer_materials')
        .select('*')
        .eq('offer_id', offerId),
    ]);

    if (offerResult.error) {
      throw new Error(
        `Kunne ikke hente tilbuddet: ${offerResult.error.message}`,
      );
    }

    if (workItemsResult.error) {
      throw new Error(
        `Kunne ikke hente arbejdsopgaver: ${workItemsResult.error.message}`,
      );
    }

    if (materialsResult.error) {
      throw new Error(
        `Kunne ikke hente materialer: ${materialsResult.error.message}`,
      );
    }

    return {
      offer: offerResult.data,
      workItems: workItemsResult.data,
      materials: materialsResult.data,
    };
  }

  async getProjectOffers(projectId: string) {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('project_id', projectId)
      .order('finalized_at', {
        ascending: false,
      });

    if (error) {
      throw new Error(
        `Kunne ikke hente tilbudshistorik: ${error.message}`,
      );
    }

    return data;
  }
}