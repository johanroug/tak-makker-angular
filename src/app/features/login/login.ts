import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);
  readonly registering = this.route.snapshot.data['register'] === true;
  readonly notice = signal('');
  repeatPassword = '';
  email = '';
  password = '';
  readonly errorMessage = signal('');
  readonly isLoggingIn = signal(false);

  constructor() {
    const reason = this.route.snapshot.queryParamMap.get('access');
    if (reason === 'pending')
      this.notice.set(
        'Din bruger afventer godkendelse fra Hovedet på sømmet. Du får først adgang, når din bruger er godkendt.',
      );
    if (reason === 'blocked')
      this.errorMessage.set('Din adgang til Hovedet på sømmet er blokeret. Kontakt Hovedet på sømmet for hjælp.');
    if (reason === 'unavailable')
      this.errorMessage.set('Kunne ikke kontrollere din adgang. Prøv at logge ind igen.');
  }

  async login() {
    if (this.isLoggingIn()) return;
    this.errorMessage.set('');
    this.notice.set('');
    this.isLoggingIn.set(true);

    try {
      if (this.registering) {
        if (this.password.length < 8 || this.password !== this.repeatPassword) {
          this.errorMessage.set('Brug mindst 8 tegn, og skriv samme adgangskode i begge felter.');
          return;
        }
        const { data, error } = await this.authService.signUp(this.email, this.password);
        if (error) {
          this.errorMessage.set(
            error.status === 429
              ? 'For mange forsøg. Vent lidt og prøv igen.'
              : 'Kunne ikke oprette brugeren. Kontrollér e-mail og adgangskode, eller prøv at logge ind.',
          );
          return;
        }
        this.password = '';
        this.repeatPassword = '';
        if (data.session) {
          await this.authService.signOut();
          this.notice.set(
            'Din bruger er oprettet og afventer godkendelse fra Hovedet på sømmet. Du kan logge ind, når din bruger er godkendt.',
          );
        } else
          this.notice.set(
            'Tjek din indbakke. Hvis adressen kan registreres, får du en bekræftelsesmail. Din bruger skal også godkendes af Hovedet på sømmet, før du får adgang.',
          );
        return;
      }
      const { error } = await this.authService.signIn(this.email.trim(), this.password);

      if (error) {
        this.errorMessage.set(
          error.status === 429
            ? 'For mange loginforsøg. Vent lidt og prøv igen.'
            : error.code === 'invalid_credentials'
              ? 'Forkert e-mail eller adgangskode.'
              : 'Login kunne ikke gennemføres. Kontrollér forbindelsen og prøv igen.',
        );
        return;
      }

      await this.router.navigate(['/projects']);
    } catch (error) {
      console.error('Could not sign in:', error);
      this.errorMessage.set(
        error instanceof Error &&
          (error.message.startsWith('Din adgang') ||
            error.message.startsWith('Din bruger') ||
            error.message.startsWith('Kunne ikke kontrollere'))
          ? error.message
          : 'Handlingen kunne ikke gennemføres. Kontrollér forbindelsen og prøv igen.',
      );
    } finally {
      this.isLoggingIn.set(false);
    }
  }
}
