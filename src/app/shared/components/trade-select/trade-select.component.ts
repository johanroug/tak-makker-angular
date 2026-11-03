import { Component, ElementRef, HostListener, inject, input, output, viewChild } from '@angular/core';
import { COMPANY_TRADES } from '../../../core/company/company-trades';

@Component({
  selector: 'app-trade-select',
  template: `
    <fieldset>
      <legend>Dine fag</legend>
      <p>Dine fag hjælper os med at foreslå de rette opgaver og materialer.</p>
      <details #dropdown (keydown.escape)="close(true); $event.preventDefault()">
        <summary [title]="selected().join(', ')">
          <span>{{ selected().length ? selected().join(', ') : 'Vælg fag' }}</span>
          <span class="chevron" aria-hidden="true"></span>
        </summary>
        <div class="options">
          @for (trade of trades; track trade) {
            <label><input type="checkbox" [checked]="selected().includes(trade)"
              (change)="toggle(trade, $any($event.target).checked)" />{{ trade }}</label>
          }
        </div>
      </details>
    </fieldset>
  `,
  styleUrl: './trade-select.component.scss',
})
export class TradeSelectComponent {
  readonly selected = input<string[]>([]);
  readonly selectedChange = output<string[]>();
  readonly trades = COMPANY_TRADES;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly dropdown = viewChild<ElementRef<HTMLDetailsElement>>('dropdown');

  toggle(trade: string, checked: boolean): void {
    this.selectedChange.emit(checked
      ? [...new Set([...this.selected(), trade])]
      : this.selected().filter((item) => item !== trade));
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    if (!this.host.nativeElement.contains(event.relatedTarget as Node | null)) this.close();
  }

  close(focus = false): void {
    const details = this.dropdown()?.nativeElement;
    if (!details?.open) return;
    details.open = false;
    if (focus) details.querySelector('summary')?.focus();
  }
}
