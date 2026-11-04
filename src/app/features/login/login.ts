import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthShell } from '../../shared/marketing/auth-shell.component';
import { COMPANY_TRADES } from '../../core/company/company-trades';
import { CompanyLookupService } from '../../core/company/company-lookup.service';
import { TradeSelectComponent } from '../../shared/components/trade-select/trade-select.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AuthShell, TradeSelectComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);
  readonly registering = this.route.snapshot.data['register'] === true;
  readonly notice = signal('');
  readonly registrationComplete = signal(false);
  repeatPassword = '';
  private readonly companyLookup = inject(CompanyLookupService);
  readonly trades = COMPANY_TRADES;
  readonly lookingUp = signal(false);
  readonly lookupMessage = signal('');
  cvr = '';
  companyName = '';
  companyAddress = '';
  selectedTrades: string[] = [];
  phone = '';

  async lookupCompany(): Promise<void> {
    if (this.lookingUp()) return;
    const cvr = this.cvr.trim();
    this.lookingUp.set(true);
    this.lookupMessage.set('');
    try {
      const company = await this.companyLookup.lookup(cvr);
      if (this.cvr.trim() !== cvr) return;
      this.companyName = company.name;
      this.companyAddress = company.address;
      if (!this.phone) this.phone = company.phone;
      this.lookupMessage.set('Virksomheden er fundet. Kontrollér oplysningerne nedenfor.');
    } catch (error) {
      if (this.cvr.trim() === cvr)
        this.lookupMessage.set(error instanceof Error ? error.message : 'CVR-opslag mislykkedes.');
    } finally { this.lookingUp.set(false); }
  }
  email = '';
  password = '';
  readonly errorMessage = signal('');
  readonly isLoggingIn = signal(false);

  registrationProblems(form: NgForm): string[] {
    if (!this.registering) return [];
    const fields: Record<string, string> = {
      cvr: 'CVR-nummer skal være 8 cifre.',
      companyName: 'Udfyld virksomhedsnavn.',
      companyAddress: 'Udfyld virksomhedsadresse.',
      email: 'Udfyld en gyldig e-mailadresse.',
      password: 'Adgangskoden skal være mindst 8 tegn.',
      repeatPassword: 'Gentag adgangskoden med mindst 8 tegn.',
    };
    const problems = Object.entries(fields)
      .filter(([name]) => form.controls[name]?.invalid)
      .map(([, message]) => message);
    if (!this.selectedTrades.length) problems.push('Vælg mindst ét fag.');
    if (this.password && this.repeatPassword && this.password !== this.repeatPassword)
      problems.push('Adgangskoderne skal være ens.');
    return problems;
  }

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
    if (this.isLoggingIn() || this.registrationComplete()) return;
    this.errorMessage.set('');
    this.notice.set('');
    this.isLoggingIn.set(true);

    try {
      if (this.registering) {
        if (!/^\d{8}$/.test(this.cvr.trim()) || !this.companyName.trim() || !this.companyAddress.trim() ||
            this.selectedTrades.length === 0 ||
            this.selectedTrades.some((trade) => !this.trades.some((item) => item === trade))) {
          this.errorMessage.set('Udfyld gyldigt CVR, virksomhedsnavn, adresse og fag.');
          return;
        }
        if (this.password.length < 8 || this.password !== this.repeatPassword) {
          this.errorMessage.set('Brug mindst 8 tegn, og skriv samme adgangskode i begge felter.');
          return;
        }
        const { data, error } = await this.authService.signUp(this.email, this.password, {
          cvr: this.cvr.trim(), company_name: this.companyName.trim(),
          company_address: this.companyAddress.trim(), trades: this.selectedTrades, phone: this.phone.trim(),
        });
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
            'Din bruger er oprettet. Log ind og prøv de 10 gratis forespørgsler.',
          );
        } else
          this.notice.set(
            'Tjek din indbakke. Hvis adressen kan registreres, får du en bekræftelsesmail. Bekræft din e-mail og log ind for at prøve de 10 gratis forespørgsler.',
          );
        this.registrationComplete.set(true);
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
