import { Injectable } from '@angular/core';

import { supabase } from '../supabase/supabase.client';
import { OfferStatus } from './offer-status';

@Injectable({
  providedIn: 'root',
})
export class OfferService {
  async updateStatus(offerId: string, previousStatus: string, status: OfferStatus) {
    const { data, error } = await supabase.rpc('update_offer_status', {
      p_offer_id: offerId,
      p_expected_status: previousStatus,
      p_status: status,
    });

    if (error) {
      if (error.code === 'PGRST202') {
        throw new Error('Status kan først gemmes, når databasemigrationen til tilbudsstatus er kørt.');
      }
      if (error.code === 'PGRST116') {
        throw new Error('Status blev ikke gemt: Tilbuddet kan være ændret, eller databasen tillader ikke opdateringen. Genindlæs og prøv igen.');
      }
      throw new Error(`Status blev ikke gemt: ${error.message} (kode: ${error.code}).`);
    }

    if (!data || data.status !== status) {
      throw new Error('Databasen returnerede ikke den valgte status. Status blev ikke bekræftet gemt.');
    }

    const { data: savedOffer, error: readError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (readError || savedOffer?.status !== status) {
      throw new Error('Den valgte status kunne ikke bekræftes ved genindlæsning fra databasen. Genindlæs tilbuddet.');
    }

    return savedOffer;
  }

  // Betingelser læses fra tilbudskopien, aldrig fra den aktuelle virksomhedsprofil.
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
