import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-line-review',
  templateUrl: './line-review.component.html',
  styleUrl: './line-review.component.scss',
})
export class LineReview {
  readonly status = input.required<string>();
  readonly label = input.required<string>();
  readonly canAccept = input(false);
  readonly disabled = input(false);
  readonly isNew = input(false);
  readonly changed = output<'accepted' | 'rejected'>();
}
