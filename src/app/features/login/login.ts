import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";

@Component({
  selector: "app-login",
  imports: [FormsModule],
  templateUrl: "./login.html",
  styleUrl: "./login.scss",
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = "";
  password = "";
  readonly errorMessage = signal("");
  readonly isLoggingIn = signal(false);

  async login() {
    if (this.isLoggingIn()) return;
    this.errorMessage.set("");
    this.isLoggingIn.set(true);

    try {
      const { error } = await this.authService.signIn(
        this.email,
        this.password,
      );

      if (error) {
        this.errorMessage.set(error.status === 429
          ? 'For mange loginforsøg. Vent lidt og prøv igen.'
          : error.code === 'invalid_credentials'
            ? 'Forkert e-mail eller adgangskode.'
            : 'Login kunne ikke gennemføres. Kontrollér forbindelsen og prøv igen.');
        return;
      }

      await this.router.navigate(["/projects"]);
    } catch (error) {
      console.error('Could not sign in:', error);
      this.errorMessage.set('Login kunne ikke gennemføres. Kontrollér forbindelsen og prøv igen.');
    } finally {
      this.isLoggingIn.set(false);
    }
  }
}