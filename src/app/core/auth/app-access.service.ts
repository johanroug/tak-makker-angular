import { Injectable } from '@angular/core';
import { supabase } from '../supabase/supabase.client';

export type AppUser = {
  id: string;
  email: string;
  company_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  blocked: boolean;
  is_admin: boolean;
};

@Injectable({ providedIn: 'root' })
export class AppAccessService {
  async allowed(): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_access_app');
    if (error) throw new Error('Kunne ikke kontrollere din adgang. Prøv igen om lidt.');
    return data === true;
  }
  async listUsers(): Promise<AppUser[]> {
    const { data, error } = await supabase.rpc('get_app_users');
    if (error) throw new Error('Kunne ikke hente brugerne. Kontrollér din adminadgang.');
    return data as unknown as AppUser[];
  }
  async setBlocked(userId: string, blocked: boolean): Promise<void> {
    const { error } = await supabase.rpc('set_app_user_blocked', {
      p_user_id: userId,
      p_blocked: blocked,
    });
    if (error) throw new Error('Adgangen kunne ikke ændres. Prøv igen.');
  }
}
