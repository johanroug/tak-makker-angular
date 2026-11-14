import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';
import { CustomersComponent } from './customers.component';
import { CustomerService, CustomerSummary } from '../../core/customers/customer.service';
import { WorkspaceState } from '../../shared/components/app-shell/workspace-state';

const customer: CustomerSummary = { id:'a', company_id:'company', name:'Mette Hansen', address:'Kontaktvej 2',postal_code:'',city:'',email:'',phone:'12345678',created_at:'',updated_at:'version1', project_count:1,last_activity:'',possible_duplicate:false };
const project={id:'project-a',project_number:'2026-0042',title:'Badeværelse',work_address:'Arbejdsvej 8',total_count:1,matches:true};

describe('Customer register navigation and editing', () => {
  const service={search:vi.fn(),get:vi.fn(),projects:vi.fn(),save:vi.fn(),resolve:vi.fn()};
  const workspace={requestNewProject:vi.fn(),loadProjects:vi.fn().mockResolvedValue(undefined)};
  beforeEach(async () => {
    for (const fn of Object.values(service)) fn.mockReset();
    workspace.requestNewProject.mockReset();
    service.search.mockReturnValue(of([customer])); service.get.mockReturnValue(of(customer));
    service.projects.mockReturnValue(of([project]));
    service.save.mockReturnValue(of({...customer,phone:'87654321',updated_at:'version2'}));
    await TestBed.configureTestingModule({ providers:[
      provideRouter([{path:'customers',component:CustomersComponent},{path:'customers/:customerId',component:CustomersComponent}]),
      {provide:CustomerService,useValue:service},{provide:WorkspaceState,useValue:workspace},
    ] }).compileComponents();
  });
  afterEach(() => TestBed.resetTestingModule());

  it('opens projects directly from the customer list without opening customer details', async () => {
    const harness=await RouterTestingHarness.create();
    const component=await harness.navigateByUrl('/customers',CustomersComponent);
    await vi.waitFor(() => expect(component.rows()).toHaveLength(1)); harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.expand')!.click(); harness.detectChanges();
    const link=harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.project-link')!;
    expect(link.getAttribute('href')).toBe('/projects/project-a');
    expect(link.textContent).toContain('2026-0042');
    expect(service.projects).toHaveBeenCalledWith('a','',0);
    expect(service.get).not.toHaveBeenCalled();
  });

  it('searches on the server and pages without downloading the whole register', async () => {
    const harness=await RouterTestingHarness.create();
    const component=await harness.navigateByUrl('/customers',CustomersComponent);
    component.query.setValue('2026-0042');
    await vi.waitFor(() => expect(service.search).toHaveBeenLastCalledWith('2026-0042',0,26));
    component.page(1);
    await vi.waitFor(() => expect(service.search).toHaveBeenLastCalledWith('2026-0042',25,26));
  });

  it('shows next only when an additional customer exists and previous only after page one', async () => {
    const customers = Array.from({length: 26}, (_, index) => ({...customer, id: `customer-${index}`}));
    service.search.mockReturnValue(of(customers.slice(0, 25)));
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/customers', CustomersComponent);
    await vi.waitFor(() => expect(component.loading()).toBe(false)); harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.pagination')).toBeNull();
    service.search.mockReturnValue(of(customers)); component.reloadList();
    await vi.waitFor(() => expect(component.hasNextPage()).toBe(true)); harness.detectChanges();
    expect(component.rows()).toHaveLength(25);
    expect(harness.routeNativeElement!.querySelector('.pagination')!.textContent).toContain('Næste');
    expect(harness.routeNativeElement!.querySelector('.pagination')!.textContent).not.toContain('Forrige');
    service.search.mockReturnValue(of([customers[25]])); component.page(1);
    await vi.waitFor(() => expect(component.hasNextPage()).toBe(false)); harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.pagination')!.textContent).toContain('Forrige');
    expect(harness.routeNativeElement!.querySelector('.pagination')!.textContent).not.toContain('Næste');
  });

  it('saves contact changes with an optimistic version and starts projects for the selected customer', async () => {
    service.search.mockReturnValue(of([]));
    const harness=await RouterTestingHarness.create();
    const component=await harness.navigateByUrl('/customers/a',CustomersComponent); harness.detectChanges();
    const input=harness.routeNativeElement!.querySelector<HTMLInputElement>('[formControlName="phone"]')!;
    input.value='87654321'; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur'));
    expect(service.save).toHaveBeenCalledWith('a',expect.objectContaining({phone:'87654321'}),'version1');
    expect(component.saved()).toBe(true);
    component.newProject(); expect(workspace.requestNewProject).toHaveBeenCalledWith('a');
  });

  it('retains unsaved changes and shows a failure instead of reporting a failed save as saved', async () => {
    service.search.mockReturnValue(of([])); service.save.mockReturnValue(throwError(() => new Error('Conflict')));
    const harness=await RouterTestingHarness.create();
    const component=await harness.navigateByUrl('/customers/a',CustomersComponent);
    component.form.controls.phone.setValue('Changed'); component.form.markAsDirty(); component.save();
    expect(component.error()).toContain('ikke gemt'); expect(component.form.dirty).toBe(true);
    expect(component.form.controls.phone.value).toBe('Changed'); expect(component.saved()).toBe(false);
  });

  it('does not replace another customer with a save response after navigating away', async () => {
    service.search.mockReturnValue(of([]));
    const response=new Subject<CustomerSummary>(); service.save.mockReturnValue(response);
    const harness=await RouterTestingHarness.create();
    const component=await harness.navigateByUrl('/customers/a',CustomersComponent);
    component.form.controls.phone.setValue('Changed'); component.form.markAsDirty(); component.save();
    service.get.mockReturnValue(of({...customer,id:'b',name:'Another customer'}));
    const next=await harness.navigateByUrl('/customers/b',CustomersComponent);
    response.next({...customer,phone:'Changed'}); response.complete();
    expect(next.customer()?.id).toBe('b'); expect(next.form.controls.name.value).toBe('Another customer');
  });
});
