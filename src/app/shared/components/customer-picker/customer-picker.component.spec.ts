import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';
import { CustomerPicker } from './customer-picker.component';
import { CustomerService, CustomerSummary } from '../../../core/customers/customer.service';

const candidate: CustomerSummary = { id: 'customer-1', company_id: 'company-1', name: 'Mette Hansen', address: 'Kontaktvej 2', email: '', phone: '', created_at: '', updated_at: '', project_count: 3, last_activity: '', possible_duplicate: false };

describe('Shared customer selection', () => {
  const search = vi.fn();
  beforeEach(async () => {
    search.mockReset().mockReturnValue(of([]));
    await TestBed.configureTestingModule({ imports: [CustomerPicker], providers: [{ provide: CustomerService, useValue: { search } }] }).compileComponents();
  });
  afterEach(() => TestBed.resetTestingModule());

  it('shows only search at first and never loads customers for an empty or one-letter query', async () => {
    const fixture=TestBed.createComponent(CustomerPicker); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.customer-suggestions')).toBeNull();
    expect(fixture.nativeElement.querySelector('.customer-fields')).toBeNull();
    fixture.componentInstance.query.setValue('M');
    await new Promise(resolve=>setTimeout(resolve,300));
    expect(search).not.toHaveBeenCalled();
    fixture.componentInstance.query.setValue('Me');
    await vi.waitFor(()=>expect(search).toHaveBeenCalledWith('Me',0,6));
    fixture.componentInstance.query.setValue(''); fixture.detectChanges();
    expect(fixture.componentInstance.results()).toEqual([]);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('debounces typed searches and selects a customer without opening a creation form', async () => {
    search.mockReturnValue(of([candidate]));
    const fixture=TestBed.createComponent(CustomerPicker); fixture.detectChanges();
    const selected=vi.fn(); fixture.componentInstance.selected.subscribe(selected);
    const input=fixture.nativeElement.querySelector('input');
    input.value='Mette Hansen'; input.dispatchEvent(new Event('input'));
    expect(search).not.toHaveBeenCalled();
    await vi.waitFor(()=>expect(search).toHaveBeenCalledWith('Mette Hansen',0,6)); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('3 projekter');
    expect(fixture.nativeElement.querySelector('.customer-fields')).toBeNull();
    fixture.nativeElement.querySelector('.customer-suggestions button').click();
    expect(selected.mock.calls[0][0].id).toBe(candidate.id);
    expect(selected.mock.calls[0][0].values).toBeUndefined();
  });

  it('creates a new customer with the reported form values despite a matching existing name', async () => {
    search.mockReturnValue(of([candidate]));
    const fixture=TestBed.createComponent(CustomerPicker); fixture.detectChanges();
    const component=fixture.componentInstance; const selected=vi.fn(); component.selected.subscribe(selected);
    component.query.setValue('Mette Hansen');
    await vi.waitFor(()=>expect(component.results()).toHaveLength(1)); fixture.detectChanges();
    fixture.nativeElement.querySelector('.mode-link').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.customer-suggestions')).toBeNull();
    const fill=(field:string,value:string)=>{
      const input=fixture.nativeElement.querySelector(`[formControlName="${field}"]`);
      input.value=value; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur'));
    };
    fill('address','testvej 2'); fill('email','asdas@gma.com'); fill('phone','99558167'); fixture.detectChanges();
    const button=fixture.nativeElement.querySelector('.primary');
    expect(button.disabled).toBe(false); button.click();
    expect(selected.mock.calls[0][0].id).not.toBe(candidate.id);
    expect(selected.mock.calls[0][0].values).toEqual({name:'Mette Hansen',address:'testvej 2',email:'asdas@gma.com',phone:'99558167'});
  });

  it('lets a new customer be saved immediately while an earlier search is pending', async () => {
    const pending=new Subject<CustomerSummary[]>(); search.mockReturnValue(pending);
    const fixture=TestBed.createComponent(CustomerPicker); fixture.detectChanges();
    const component=fixture.componentInstance; const selected=vi.fn(); component.selected.subscribe(selected);
    component.query.setValue('Ny kunde'); await vi.waitFor(()=>expect(search).toHaveBeenCalled());
    expect(component.loading()).toBe(true);
    component.startNew(); fixture.detectChanges();
    expect(component.loading()).toBe(false);
    pending.next([candidate]);
    fixture.nativeElement.querySelector('.primary').click();
    expect(selected.mock.calls[0][0].values.name).toBe('Ny kunde');
    expect(component.results()).toEqual([]);
  });

  it('explains validation errors instead of silently disabling the create button', () => {
    const fixture=TestBed.createComponent(CustomerPicker); fixture.detectChanges();
    const component=fixture.componentInstance; const selected=vi.fn(); component.selected.subscribe(selected);
    component.startNew(); fixture.detectChanges();
    fixture.nativeElement.querySelector('.primary').click(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Angiv kundens navn'); expect(selected).not.toHaveBeenCalled();
    component.form.patchValue({name:'Ny kunde',email:'ugyldig'}); component.create(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('gyldig e-mail'); expect(selected).not.toHaveBeenCalled();
    component.form.controls.email.setValue('asdas@gma.com'); component.create();
    expect(selected).toHaveBeenCalledTimes(1);
  });

  it('retains creation values and identity for a retry after a failed save', () => {
    const fixture=TestBed.createComponent(CustomerPicker); fixture.detectChanges();
    const component=fixture.componentInstance; const selected=vi.fn(); component.selected.subscribe(selected);
    component.startNew(); component.form.patchValue({name:'Ny kunde',address:'testvej 2'}); component.create();
    fixture.componentRef.setInput('saveError','Gemning fejlede'); fixture.detectChanges();
    expect(component.chosen()).toBe(''); expect(component.mode()).toBe('new');
    expect(component.form.controls.address.value).toBe('testvej 2');
    fixture.componentRef.setInput('saveError',''); fixture.detectChanges(); component.create();
    expect(selected.mock.calls[1][0].id).toBe(selected.mock.calls[0][0].id);
  });

  it('handles Enter inside customer fields without submitting the surrounding project form', () => {
    const fixture=TestBed.createComponent(CustomerPicker); fixture.detectChanges();
    const component=fixture.componentInstance; const selected=vi.fn(); component.selected.subscribe(selected);
    const searchEnter=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});
    fixture.nativeElement.querySelector('input').dispatchEvent(searchEnter); expect(searchEnter.defaultPrevented).toBe(true);
    component.startNew(); component.form.patchValue({name:'Ny kunde'}); fixture.detectChanges();
    const createEnter=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});
    fixture.nativeElement.querySelector('[formControlName="name"]').dispatchEvent(createEnter);
    expect(createEnter.defaultPrevented).toBe(true); expect(selected).toHaveBeenCalledTimes(1);
  });

  it('clears old choices and form values when explicitly choosing another customer', () => {
    const fixture=TestBed.createComponent(CustomerPicker); fixture.detectChanges();
    const component=fixture.componentInstance;
    component.startNew(); component.form.patchValue({name:'Previous customer',email:'old@example.test'}); component.create();
    component.resetChoice(); fixture.detectChanges();
    expect(component.query.value).toBe(''); expect(component.form.controls.name.value).toBe('');
    expect(component.form.controls.email.value).toBe(''); expect(component.chosen()).toBe('');
    expect(fixture.nativeElement.querySelector('.customer-suggestions')).toBeNull();
  });

  it('checks an explicit AI name but requires a choice when a matching customer exists', async () => {
    search.mockReturnValue(of([candidate]));
    const fixture=TestBed.createComponent(CustomerPicker);
    fixture.componentRef.setInput('initialName','Mette Hansen'); fixture.componentRef.setInput('autoCreate',true);
    const selected=vi.fn(); fixture.componentInstance.selected.subscribe(selected); fixture.detectChanges();
    await vi.waitFor(()=>expect(fixture.componentInstance.results()).toHaveLength(1));
    expect(selected).not.toHaveBeenCalled();
  });

  it('creates an unmatched AI customer from extracted contact facts', async () => {
    const fixture=TestBed.createComponent(CustomerPicker);
    fixture.componentRef.setInput('initialName','Ny kunde'); fixture.componentRef.setInput('initialEmail','kunde@example.test');
    fixture.componentRef.setInput('initialPhone','12345678'); fixture.componentRef.setInput('autoCreate',true);
    const selected=vi.fn(); fixture.componentInstance.selected.subscribe(selected); fixture.detectChanges();
    await vi.waitFor(()=>expect(selected).toHaveBeenCalledTimes(1));
    expect(selected.mock.calls[0][0].values).toMatchObject({name:'Ny kunde',email:'kunde@example.test',phone:'12345678'});
  });

  it('cancels stale search results when the query changes', async () => {
    const stale=new Subject<CustomerSummary[]>(); search.mockReturnValueOnce(stale).mockReturnValue(of([candidate]));
    const fixture=TestBed.createComponent(CustomerPicker); fixture.detectChanges();
    fixture.componentInstance.query.setValue('Første'); await vi.waitFor(()=>expect(search).toHaveBeenCalledTimes(1));
    fixture.componentInstance.query.setValue('Mette'); stale.next([{...candidate,name:'Wrong result'}]);
    expect(fixture.componentInstance.results()).toEqual([]);
    await vi.waitFor(()=>expect(fixture.componentInstance.results()[0]?.name).toBe('Mette Hansen'));
  });

  it('allows explicit creation after a failed search without treating failure as an automatic new customer', async () => {
    search.mockReturnValue(throwError(()=>new Error('Offline')));
    const fixture=TestBed.createComponent(CustomerPicker);
    fixture.componentRef.setInput('initialName','Mette'); fixture.componentRef.setInput('autoCreate',true);
    const selected=vi.fn(); fixture.componentInstance.selected.subscribe(selected); fixture.detectChanges();
    await vi.waitFor(()=>expect(fixture.componentInstance.error()).not.toBe(''));
    expect(selected).not.toHaveBeenCalled();
    fixture.componentInstance.startNew(); fixture.componentInstance.create();
    expect(selected).toHaveBeenCalledTimes(1);
  });
});
