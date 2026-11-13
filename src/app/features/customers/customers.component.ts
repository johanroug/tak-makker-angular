import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, finalize, of, switchMap, tap, timer } from 'rxjs';
import { Customer, CustomerProject, CustomerService, CustomerSummary } from '../../core/customers/customer.service';
import { WorkspaceState } from '../../shared/components/app-shell/workspace-state';
import { CustomerChoice, CustomerPicker } from '../../shared/components/customer-picker/customer-picker.component';

@Component({
  selector: 'app-customers', imports: [RouterLink, ReactiveFormsModule, CustomerPicker],
  templateUrl: './customers.component.html', styleUrl: './customers.component.scss',
})
export class CustomersComponent {
  private readonly service = inject(CustomerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceState);
  private readonly destroy = inject(DestroyRef);
  private readonly searches = new Subject<void>();
  private readonly details = new Subject<string>();
  readonly query = new FormControl('', { nonNullable: true });
  readonly rows = signal<CustomerSummary[]>([]);
  readonly customer = signal<Customer | null>(null);
  readonly customerId = signal<string | null>(null);
  readonly duplicates = signal<CustomerSummary[]>([]);
  readonly duplicateOffset = signal(0);
  readonly offset = signal(0);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');
  readonly detailProjects = signal<CustomerProject[]>([]);
  readonly projectOffset = signal(0);
  readonly projectsLoading = signal(false);
  readonly projectsError = signal('');
  readonly expanded = signal<string | null>(null);
  readonly expandedProjects = signal<CustomerProject[]>([]);
  readonly expandedOffset = signal(0);
  readonly creating = signal(false);
  readonly mergeTarget = signal<CustomerSummary | null>(null);
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/.*\S.*/), Validators.maxLength(200)] }),
    address: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: Validators.email }),
    phone: new FormControl('', { nonNullable: true }),
  });
  private projectRequest = 0;

  constructor() {
    this.query.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => { this.offset.set(0); this.reloadList(); });
    this.searches.pipe(
      tap(() => { this.loading.set(true); this.error.set(''); this.expanded.set(null); this.rows.set([]); }),
      switchMap(() => timer(250).pipe(switchMap(() => this.service.search(this.query.value, this.offset())), catchError(() => {
        this.error.set('Kunderne kunne ikke hentes. Prøv igen.'); return of([]);
      }))), takeUntilDestroyed(this.destroy),
    ).subscribe(rows => { this.rows.set(rows); this.loading.set(false); });
    this.details.pipe(
      tap(() => { this.loading.set(true); this.saved.set(false); this.error.set(''); this.customer.set(null); this.mergeTarget.set(null); this.duplicates.set([]); this.detailProjects.set([]); }),
      switchMap(id => this.service.get(id).pipe(catchError(() => { this.error.set('Kunden kunne ikke hentes. Den kan være flyttet eller samlet med en anden kunde.'); return of(null); }))),
      takeUntilDestroyed(this.destroy),
    ).subscribe(customer => {
      this.customer.set(customer); this.loading.set(false);
      if (customer) {
        this.form.reset({ name: customer.name, address: customer.address, email: customer.email, phone: customer.phone });
        this.projectOffset.set(0); this.duplicateOffset.set(0); this.loadDetailProjects(); this.loadDuplicates();
      }
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(params => {
      this.customerId.set(params.get('customerId')); this.creating.set(false); this.error.set('');
      this.projectRequest++;
      if (this.customerId()) this.details.next(this.customerId()!);
      else { this.customer.set(null); this.reloadList(); }
    });
  }

  reloadList(): void { this.searches.next(); }
  reload(): void { if (this.customerId()) this.details.next(this.customerId()!); else this.reloadList(); }
  page(direction: number): void { this.offset.update(n => Math.max(0, n + direction * 25)); this.reloadList(); }

  expand(id: string): void {
    if (this.expanded() === id) { this.expanded.set(null); this.projectRequest++; return; }
    this.expanded.set(id); this.expandedOffset.set(0); this.loadExpanded();
  }
  loadExpanded(direction = 0): void {
    const id = this.expanded(); if (!id) return;
    this.expandedOffset.update(n => Math.max(0, n + direction * 20));
    this.loadProjects(id, this.query.value, this.expandedOffset(), false);
  }
  loadDetailProjects(direction = 0): void {
    const id = this.customerId(); if (!id) return;
    this.projectOffset.update(n => Math.max(0, n + direction * 20));
    this.loadProjects(id, '', this.projectOffset(), true);
  }
  private loadProjects(id: string, query: string, offset: number, detail: boolean): void {
    const request = ++this.projectRequest;
    this.projectsLoading.set(true); this.projectsError.set('');
    (detail ? this.detailProjects : this.expandedProjects).set([]);
    this.service.projects(id, query, offset).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: rows => { if (request !== this.projectRequest) return; (detail ? this.detailProjects : this.expandedProjects).set(rows); this.projectsLoading.set(false); },
      error: () => { if (request !== this.projectRequest) return; this.projectsError.set('Projekterne kunne ikke hentes.'); this.projectsLoading.set(false); },
    });
  }

  save(): void {
    const customer = this.customer();
    if (!customer || this.saving() || this.form.invalid || !this.form.dirty) return;
    const values = this.form.getRawValue();
    this.saving.set(true); this.saved.set(false); this.error.set('');
    this.service.save(customer.id, values, customer.updated_at).pipe(
      finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroy),
    ).subscribe({ next: saved => { if (this.customerId() !== saved.id) return; this.customer.set(saved); this.form.markAsPristine(); this.saved.set(true); void this.workspace.loadProjects(); },
      error: () => { if (this.customerId() === customer.id) this.error.set('Ændringerne er ikke gemt. Kunden kan være ændret andetsteds. Prøv igen, eller genindlæs kunden.'); } });
  }

  create(choice: CustomerChoice | null): void {
    if (!choice || this.saving()) return;
    if (!choice.values) { void this.router.navigate(['/customers', choice.id]); return; }
    this.saving.set(true); this.error.set('');
    this.service.save(choice.id, choice.values).pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroy)).subscribe({
      next: customer => { this.creating.set(false); void this.router.navigate(['/customers', customer.id]); },
      error: () => this.error.set('Kunden kunne ikke oprettes. Prøv igen.'),
    });
  }
  newProject(): void {
    const customer = this.customer(); if (customer) this.workspace.requestNewProject(customer.id);
  }
  loadDuplicates(direction = 0): void {
    const id = this.customerId(); if (!id) return;
    this.duplicateOffset.update(n => Math.max(0,n + direction * 10));
    this.service.search('', this.duplicateOffset(), 10, id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: rows => { if (id === this.customerId()) this.duplicates.set(rows); },
      error: () => { if (id === this.customerId()) this.error.set('Mulige dubletter kunne ikke hentes. Genindlæs kunden.'); },
    });
  }
  resolve(target: CustomerSummary, same: boolean): void {
    const customer = this.customer(); if (!customer || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.service.resolve(customer.id, target.id, same).pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { if (this.customerId() !== customer.id) return; this.mergeTarget.set(null); if (same) { void this.workspace.loadProjects(); void this.router.navigate(['/customers',target.id]); } else this.loadDuplicates(); },
      error: () => this.error.set('Valget kunne ikke gemmes. Genindlæs kunden.'),
    });
  }
}
