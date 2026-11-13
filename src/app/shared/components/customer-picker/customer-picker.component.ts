import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap, tap, timer } from 'rxjs';
import { CustomerChoice, CustomerService, CustomerSummary } from '../../../core/customers/customer.service';

export type { CustomerChoice } from '../../../core/customers/customer.service';

@Component({
  selector: 'app-customer-picker',
  imports: [ReactiveFormsModule],
  template: `
    <div class="customer-picker">
      @if (chosen()) {
        <p class="chosen-customer" role="status">{{ chosen() }}</p>
        <button type="button" class="mode-link" (click)="resetChoice()">Vælg en anden kunde</button>
      } @else if (mode() === 'search') {
        <label>Søg efter kunde<input type="search" [formControl]="query" maxlength="160" autocomplete="off" placeholder="Skriv navn, adresse, e-mail eller telefon" (keydown.enter)="$event.preventDefault()" /></label>
        @if (query.value.trim().length < 2) { <p class="search-hint">Skriv mindst 2 tegn for at søge.</p> }
        @if (loading()) { <p role="status">Søger efter kunder…</p> }
        @if (error()) { <p role="alert">{{ error() }}</p> }
        @if (results().length) {
          <ul class="customer-suggestions" aria-label="Fundne kunder">
            @for (customer of results(); track customer.id) {
              <li><button type="button" (click)="choose(customer)"><strong>{{ customer.name }}</strong><span>{{ customer.address || 'Ingen kontaktadresse' }} · {{ customer.project_count }} projekter</span></button></li>
            }
          </ul>
        } @else if (searched() && !error()) { <p>Ingen kunder matcher søgningen.</p> }
        @if (!deferred()) { <button type="button" class="mode-link" (click)="startNew()">＋ Opret ny kunde</button> }
      } @else {
        <div class="new-customer" [formGroup]="form" (keydown.enter)="submitNew($event)">
          <h3>Ny kunde</h3>
          <label>Kundenavn <input formControlName="name" maxlength="200" autocomplete="name" placeholder="Kundens navn" /></label>
          @if (form.controls.name.touched && form.controls.name.invalid) { <p role="alert">Angiv kundens navn på højst 200 tegn.</p> }
          <div class="customer-fields">
            <label>Kontaktadresse<input formControlName="address" maxlength="1000" autocomplete="street-address" /></label>
            <label>E-mail <small>Valgfri</small><input formControlName="email" type="email" maxlength="320" autocomplete="email" /></label>
            <label>Telefon <small>Valgfrit</small><input formControlName="phone" type="tel" maxlength="100" autocomplete="tel" /></label>
          </div>
          @if (form.controls.email.touched && form.controls.email.invalid) { <p role="alert">Angiv en gyldig e-mail, eller lad feltet være tomt.</p> }
          @if (!deferred()) { <div class="customer-actions">
            <button type="button" class="primary" (click)="create()">{{ createLabel() }}</button>
            <button type="button" (click)="backToSearch()">Søg efter eksisterende kunde</button>
          </div> }
        </div>
      }
    </div>
  `,
  styleUrl: './customer-picker.component.scss',
})
export class CustomerPicker {
  private readonly service = inject(CustomerService);
  private readonly destroy = inject(DestroyRef);
  private readonly requests = new Subject<{ query: string; automatic: boolean }>();
  readonly initialName = input('');
  readonly initialAddress = input('');
  readonly initialEmail = input('');
  readonly initialPhone = input('');
  readonly autoCreate = input(false);
  readonly deferred = input(false);
  readonly startNewCustomer = input(false);
  readonly createLabel = input('Opret kunde');
  readonly saveError = input('');
  readonly selected = output<CustomerChoice | null>();
  readonly query = new FormControl('', { nonNullable: true });
  readonly mode = signal<'search' | 'new'>('search');
  readonly results = signal<CustomerSummary[]>([]);
  readonly searched = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly chosen = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200), Validators.pattern(/.*\S.*/)] }),
    address: new FormControl('', { nonNullable: true, validators: Validators.maxLength(1000) }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(320)] }),
    phone: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
  });
  private id = crypto.randomUUID();
  private automaticName = '';

  constructor() {
    this.requests.pipe(
      tap(() => { this.loading.set(false); this.results.set([]); this.error.set(''); this.searched.set(false); }),
      switchMap(request => {
        if (request.query.trim().length < 2 || this.mode() !== 'search' || this.chosen()) {
          return of({ rows: [] as CustomerSummary[], request, searched: false, failed: false });
        }
        this.loading.set(true);
        return timer(250).pipe(
          switchMap(() => this.service.search(request.query.trim(), 0, 6)),
          map(rows => ({ rows, request, searched: true, failed: false })),
          catchError(() => of({ rows: [] as CustomerSummary[], request, searched: true, failed: true })),
        );
      }), takeUntilDestroyed(this.destroy),
    ).subscribe(({ rows, request, searched, failed }) => {
      this.loading.set(false);
      if (this.mode() !== 'search' || this.chosen()) return;
      this.results.set(rows); this.searched.set(searched);
      if (failed) this.error.set('Søgningen kunne ikke gennemføres. Prøv igen, eller opret en ny kunde.');
      if (request.automatic && searched && !failed && !rows.length && this.autoCreate() && this.form.valid) this.create();
    });
    this.query.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(query => this.requests.next({ query, automatic: false }));
    effect(() => {
      const values = { name: this.initialName(), address: this.initialAddress(), email: this.initialEmail(), phone: this.initialPhone() };
      const automatic = this.autoCreate();
      untracked(() => {
        if (!this.form.dirty && !this.chosen()) this.form.patchValue(values, { emitEvent: false });
        // Only an explicitly AI-extracted name is checked without typing.
        if (automatic && values.name.trim().length >= 2 && this.mode() === 'search' && !this.chosen() && this.automaticName !== values.name) {
          this.automaticName = values.name;
          this.query.setValue(values.name, { emitEvent: false });
          this.requests.next({ query: values.name, automatic: true });
        }
      });
    });
    effect(() => {
      if (this.saveError()) untracked(() => this.chosen.set(''));
    });
    effect(() => {
      if (this.startNewCustomer()) untracked(() => this.startNew());
    });
  }

  startNew(): void {
    this.mode.set('new');
    this.requests.next({ query: '', automatic: false });
    const name = this.query.value.trim();
    if (!this.form.controls.name.value.trim() && !name.includes('@') && /\p{L}/u.test(name)) this.form.controls.name.setValue(name);
  }

  backToSearch(): void {
    this.mode.set('search');
    this.requests.next({ query: this.query.value, automatic: false });
  }

  choose(customer: CustomerSummary): void {
    this.chosen.set(`Valgt: ${customer.name} · ${customer.address || 'Ingen kontaktadresse'}`);
    this.requests.next({ query: '', automatic: false });
    this.selected.emit({ id: customer.id, customer });
  }

  create(): void {
    const choice = this.newChoice();
    if (!choice) return;
    this.chosen.set(`Ny kunde: ${choice.values!.name}`);
    this.requests.next({ query: '', automatic: false });
    this.selected.emit(choice);
  }

  newChoice(): CustomerChoice | null {
    this.form.markAllAsTouched();
    if (this.form.invalid) return null;
    const raw = this.form.getRawValue();
    const values = { name: raw.name.trim(), address: raw.address.trim(), email: raw.email.trim(), phone: raw.phone.trim() };
    return { id: this.id, values };
  }

  resetChoice(): void {
    this.chosen.set(''); this.id = crypto.randomUUID(); this.mode.set('search');
    this.form.reset({ name: this.initialName(), address: this.initialAddress(), email: this.initialEmail(), phone: this.initialPhone() });
    this.query.setValue(''); this.selected.emit(null);
  }

  submitNew(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      event.preventDefault(); event.stopPropagation();
      if (!this.deferred()) this.create();
    }
  }
}
