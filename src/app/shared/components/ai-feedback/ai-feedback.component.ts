import { Component, effect, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { warningTradeParts } from './warning-trade-links';

export type AiSuggestionSummary = {
  scopeWarnings?: string[];
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
  imports: [RouterLink],
  host: { '[class.notice]': 'notice()' },
  templateUrl: './ai-feedback.component.html',
  styleUrl: './ai-feedback.component.scss',
})
export class AiFeedback {
  protected readonly warningTradeParts = warningTradeParts;
  readonly notice = input(false);
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
  templateUrl: './new-suggestion-badge.component.html',
  styleUrl: './new-suggestion-badge.component.scss',
})
export class NewSuggestionBadge {}
