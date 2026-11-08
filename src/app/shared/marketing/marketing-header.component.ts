import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { supabase } from '../../core/supabase/supabase.client';
import { RouterLink } from '@angular/router';
import { PublicBrandComponent } from '../components/public-brand/public-brand.component';

@Component({
  selector: 'app-marketing-header',
  imports: [RouterLink, PublicBrandComponent],
  templateUrl: './marketing-header.component.html',
})
export class MarketingHeader {
  readonly signedIn = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  constructor() {
    // Keep prerendered HTML public; resolve this browser's session after hydration.
    afterNextRender(() => {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        this.signedIn.set(!!session);
      });
      this.destroyRef.onDestroy(() => data.subscription.unsubscribe());
    });
  }
}
