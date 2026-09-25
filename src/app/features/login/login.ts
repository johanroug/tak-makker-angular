import { Component, inject } from "@angular/core";
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
  errorMessage = "";
  isLoggingIn = false;

  async login() {
    this.errorMessage = "";
    this.isLoggingIn = true;

    try {
      const { error } = await this.authService.signIn(
        this.email,
        this.password,
      );

      if (error) {
        this.errorMessage = "Forkert e-mail eller adgangskode.";
        return;
      }

      await this.router.navigate(["/projects"]);
    } finally {
      this.isLoggingIn = false;
    }
  }
}