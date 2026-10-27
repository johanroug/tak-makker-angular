import { Component, effect, input, output, signal } from '@angular/core';

export type AiSuggestionSummary = {
  workItems: number;
  materials: number;
  updatedWorkItems: number;
  updatedMaterials: number;
  materialPrices: number;
  materialQuantities: number;
  materialUnits: number;
  workHours: number;
};

@Component({
  selector: 'app-ai-feedback',
  templateUrl: './ai-feedback.component.html',
  styleUrl: './ai-feedback.component.scss',
})
export class AiFeedback {
  readonly isWorking = input(false);
  readonly result = input<AiSuggestionSummary | null>(null);
  readonly openTab = output<'tasks' | 'materials' | 'chat'>();
  readonly dismiss = output<void>();
  readonly message = signal('Tænker videre på din opgave…');

  private readonly messages = [
    'Tænker videre på din opgave…',
    'Kigger nærmere på detaljerne…',
    'Finder den røde tråd i dine ønsker…',
    'Tænker i opgaver og materialer…',
    'Giver dit projekt lidt ekstra omtanke…',
    'Samler trådene til dit næste skridt…',
  ];

  constructor() {
    effect((onCleanup) => {
      if (!this.isWorking()) return;
      this.message.set(this.messages[0]);
      const timer = setInterval(() => {
        const next = this.messages.filter((text) => text !== this.message());
        this.message.set(next[Math.floor(Math.random() * next.length)]);
      }, 1800);
      onCleanup(() => clearInterval(timer));
    });
  }
}

@Component({
  selector: 'app-new-suggestion-badge',
  template: '✦ Nyt forslag',
  styles: `
    :host {
      display: inline-block;
      margin-bottom: 8px;
      padding: 4px 8px;
      border-radius: 6px;
      background: #f3e8ff;
      color: #7e22ce;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
  `,
})
export class NewSuggestionBadge {}
