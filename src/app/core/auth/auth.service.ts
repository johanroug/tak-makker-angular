import { Injectable } from "@angular/core";
import { supabase } from "../supabase/supabase.client";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async signOut() {
    return supabase.auth.signOut();
  }

  async getUser() {
    return supabase.auth.getUser();
  }
}