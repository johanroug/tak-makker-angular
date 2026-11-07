import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { COMPANY_TRADES } from '../../../core/company/company-trades';

@Component({
  selector: 'app-trade-select',
  templateUrl: './trade-select.component.html',
  styleUrl: './trade-select.component.scss',
})
export class TradeSelectComponent {
  private static nextId = 0;
  readonly inputIdPrefix = `trade-select-${TradeSelectComponent.nextId++}`;
  readonly selected = input<string[]>([]);
  readonly selectedChange = output<string[]>();
  readonly trades = COMPANY_TRADES;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly dropdown = viewChild<ElementRef<HTMLDetailsElement>>('dropdown');

  toggle(trade: string, checked: boolean): void {
    this.selectedChange.emit(
      checked
        ? [...new Set([...this.selected(), trade])]
        : this.selected().filter((item) => item !== trade),
    );
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('document:focusin', ['$event'])
  onFocusIn(event: FocusEvent): void {
    // Close only after focus has actually moved outside. Closing during a
    // label's intermediate focusout can interrupt native activation.
    if (!this.host.nativeElement.contains(event.target as Node | null)) this.close();
  }

  close(focus = false): void {
    const details = this.dropdown()?.nativeElement;
    if (!details?.open) return;
    details.open = false;
    if (focus) details.querySelector('summary')?.focus();
  }
}
