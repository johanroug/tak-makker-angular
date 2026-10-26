import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-line-review',
  template: `
    <div class="line-review">
      <span
        class="review-state"
        [class.accepted]="status() === 'accepted'"
        [class.rejected]="status() === 'rejected'"
      >
        @if (status() === 'accepted') {
          <span aria-hidden="true">✓</span>
        }
        {{
          status() === 'accepted'
            ? 'Godkendt'
            : status() === 'rejected'
              ? 'Afvist'
              : isNew()
                ? 'Nyt forslag'
                : 'Afventer godkendelse'
        }}</span
      >
      <div class="review-actions">
        @if (status() !== 'accepted') {
          <button
            class="approve"
            type="button"
            [disabled]="disabled() || !canAccept()"
            [attr.aria-label]="'Godkend ' + label()"
            [title]="canAccept() ? '' : 'Udfyld de påkrævede felter først'"
            (click)="changed.emit('accepted')"
          >
            Godkend
          </button>
        }
        @if (status() !== 'rejected') {
          <button
            class="reject"
            type="button"
            [disabled]="disabled()"
            [attr.aria-label]="'Afvis ' + label()"
            (click)="changed.emit('rejected')"
          >
            Afvis
          </button>
        }
      </div>
    </div>
    @if (status() !== 'accepted' && !canAccept() && !disabled()) {
      <p class="review-help">Udfyld de påkrævede felter for at godkende.</p>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-top: 12px;
    }
    .line-review {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .review-state {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: #8a6226;
    }
    .accepted {
      color: #64816a;
    }
    .rejected {
      color: #857c75;
    }
    .review-actions {
      display: flex;
      gap: 7px;
    }
    button {
      min-height: 36px;
      padding: 7px 10px;
      border-radius: 6px;
      border: 1px solid #d4e0cd;
      font: inherit;
      font-size: 11px;
      cursor: pointer;
    }
    .approve {
      color: #fff;
      background: #21573a;
      border-color: #21573a;
    }
    .reject {
      color: #a54940;
      background: #fff;
      border-color: #ecd9d5;
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    button:focus-visible {
      outline: 2px solid #2574b8;
      outline-offset: 2px;
    }
    .review-help {
      margin: 6px 0 0;
      color: #917a54;
      font-size: 10px;
    }
    @media (pointer: coarse) {
      button {
        min-height: 44px;
      }
    }
  `,
})
export class LineReview {
  readonly status = input.required<string>();
  readonly label = input.required<string>();
  readonly canAccept = input(false);
  readonly disabled = input(false);
  readonly isNew = input(false);
  readonly changed = output<'accepted' | 'rejected'>();
}
