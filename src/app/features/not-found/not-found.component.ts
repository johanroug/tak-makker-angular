import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `<main>
    <p>404</p>
    <h1>Her er der ikke noget tilbud.</h1>
    <p>Siden findes ikke. Gå til forsiden, eller åbn appen for at finde dine projekter.</p>
    <a routerLink="/">Til forsiden</a> · <a routerLink="/projects">Åbn appen</a>
  </main>`,
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: 24px;
      background: #f6f3eb;
      color: #20392f;
      font-family: Arial, sans-serif;
    }
    main {
      max-width: 580px;
    }
    h1 {
      font-size: 40px;
    }
    p {
      line-height: 1.8;
    }
    a {
      display: inline-block;
      padding: 16px 0;
      color: inherit;
    }
  `,
})
export class NotFoundComponent {}
