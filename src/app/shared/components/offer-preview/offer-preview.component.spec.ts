import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfferPreview } from './offer-preview.component';
import { ProjectService } from '../../../core/projects/project.service';
import { OfferService } from '../../../core/offers/offer.service';
import { OfferPdfService } from '../../../core/offers/offer-pdf.service';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;
const projectData = () => ({
  project: { id: 'project', title: 'Badeværelse', description: 'Renovering', hourly_rate: 500, customer_name: 'Kunde', customer_address: 'Adresse', validity_days: 30 },
  company: { name: 'Firma', cvr: '12345678', address: 'Adresse', phone: '12345678', email: 'firma@example.com' },
  workItems: [{ id: 'work', trade: 'VVS', description: 'Montering', estimated_hours: 2, status: 'accepted' }],
  materials: [
    { id: 'material', name: 'Armatur', quantity: 2, unit: 'stk.', unit_price: 100, status: 'accepted' },
    { id: 'invalid', name: 'Ukendt', quantity: null, unit: 'stk.', unit_price: 50, status: 'suggested' },
  ], messages: [],
}) as unknown as ProjectData;

describe('Quotation workspace', () => {
  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    await TestBed.configureTestingModule({
      imports: [OfferPreview],
      providers: [provideRouter([]), { provide: ProjectService, useValue: {} }, { provide: OfferService, useValue: {} }, { provide: OfferPdfService, useValue: {} }],
    }).compileComponents();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

  it('keeps both sets of accepted lines in the total and retains an edited field across tab switches', async () => {
    const fixture = TestBed.createComponent(OfferPreview);
    fixture.componentRef.setInput('data', projectData());
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const edited = host.querySelector<HTMLInputElement>('input[aria-label="Arbejdsbeskrivelse"]')!;
    edited.value = 'Montering af nyt armatur';
    edited.dispatchEvent(new Event('input'));
    fixture.componentInstance.sectionChanged.subscribe(section => fixture.componentRef.setInput('activeSection', section));
    host.querySelector<HTMLButtonElement>('#materials-tab')!.click();
    fixture.detectChanges();
    expect(host.querySelector('#materials-tab')?.getAttribute('aria-selected')).toBe('true');
    expect(fixture.componentInstance.total).toBe(1500);
    expect(host.querySelector('.quotation-grand-total')?.textContent).toContain('1.500');
    fixture.componentRef.setInput('activeSection', 'offer');
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedTab()).toBe('materials');
    host.querySelector<HTMLButtonElement>('#tasks-tab')!.click();
    fixture.detectChanges();
    expect(edited.value).toBe('Montering af nyt armatur');
    expect(fixture.componentInstance.total).toBe(1500);
  });

  it('blocks the new approval controls while edits are pending and for incomplete material lines', () => {
    const fixture = TestBed.createComponent(OfferPreview);
    fixture.componentRef.setInput('data', projectData());
    fixture.componentRef.setInput('hasPendingChanges', true);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const changed = vi.fn();
    fixture.componentInstance.statusChanged.subscribe(changed);
    const work = host.querySelector<HTMLButtonElement>('#tasks-panel .line-check')!;
    expect(work.disabled).toBe(true);
    work.click();
    expect(changed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('hasPendingChanges', false);
    fixture.detectChanges();
    const invalid = host.querySelector<HTMLButtonElement>('.line-check[aria-label="Godkend Ukendt"]')!;
    expect(invalid.disabled).toBe(true);
    work.click();
    expect(changed).toHaveBeenCalledWith({ kind: 'work', id: 'work', status: 'rejected' });
  });
});
