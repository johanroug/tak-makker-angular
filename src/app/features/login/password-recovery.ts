import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-password-recovery',
  imports: [FormsModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrl: './login.scss',
})
export class PasswordRecovery implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly resetting = this.route.snapshot.data['resetPassword'] === true;
  readonly checking = signal(this.resetting);
  readonly validSession = signal(false);
  readonly accountEmail = signal('');
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly completed = signal(false);
  readonly error = signal('');
  email = '';
  password = '';
  repeatPassword = '';

  async ngOnInit() {
    if (!this.resetting) return;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    try {
      if (fragment.has('error') || this.route.snapshot.queryParamMap.has('error')) {
        this.error.set('Linket er ugyldigt eller udløbet. Bed om et nyt link.');
        return;
      }
      const { data, error } = await this.auth.passwordResetUser();
      if (error || !data.user) {
        this.error.set('Linket er ugyldigt eller udløbet. Bed om et nyt link.');
        return;
      }
      this.accountEmail.set(data.user.email ?? 'din bruger');
      this.validSession.set(true);
    } catch {
      this.error.set('Kunne ikke kontrollere linket. Kontrollér forbindelsen og prøv igen.');
    } finally {
      this.checking.set(false);
    }
  }

  async submit() {
    if (this.busy() || this.completed()) return;
    this.error.set('');
    if (this.resetting && (!this.validSession() || this.password.length < 8 || this.password !== this.repeatPassword)) {
      this.error.set('Brug mindst 8 tegn, og skriv samme adgangskode i begge felter.');
      return;
    }
    this.busy.set(true);
    try {
      if (!this.resetting) {
        const { error } = await this.auth.requestPasswordReset(this.email);
        if (error) {
          this.error.set(error.status === 429
            ? 'For mange forsøg. Vent lidt og prøv igen.'
            : 'Mailen kunne ikke sendes. Kontrollér forbindelsen og prøv igen.');
          return;
        }
        this.sent.set(true);
        return;
      }
      const { error } = await this.auth.updatePassword(this.password);
      if (error) {
        this.error.set(error.code === 'same_password'
          ? 'Vælg en anden adgangskode end din nuværende.'
          : error.code === 'weak_password'
            ? 'Vælg en stærkere adgangskode med mindst 8 tegn.'
            : 'Adgangskoden kunne ikke gemmes. Prøv igen, eller bed om et nyt link.');
        return;
      }
      this.password = '';
      this.repeatPassword = '';
      this.validSession.set(false);
      this.completed.set(true);
      // Return through normal login so approval and blocking checks still apply.
      try { await this.auth.signOut(); } catch { /* The password has already been saved. */ }
    } catch {
      this.error.set('Handlingen kunne ikke gennemføres. Kontrollér forbindelsen og prøv igen.');
    } finally {
      this.busy.set(false);
    }
  }
}
