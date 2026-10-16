import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyProfileComponent } from './company-profile';
import { CompanyService, type CompanyProfile } from '../../core/company/company.service';

describe('Virksomhedsprofil', () => {
  const profile: CompanyProfile = {
    companyName: 'Testfirma', address: 'Testvej 1\n8000 Aarhus C', cvr: '12345678',
    contactName: '', phone: '+45 12345678', email: 'firma@example.dk',
    defaultHourlyRate: 500, validityDays: 30, paymentTerms: '', reservations: '',
  };
  const service = {
    getCurrentCompanyProfile: vi.fn(),
    updateCurrentCompanyProfile: vi.fn(),
  };
  let component: CompanyProfileComponent;

  beforeEach(() => {
    vi.resetAllMocks();
    service.getCurrentCompanyProfile.mockResolvedValue({ ...profile });
    service.updateCurrentCompanyProfile.mockResolvedValue(undefined);
    TestBed.configureTestingModule({ providers: [
      { provide: CompanyService, useValue: service },
      { provide: Location, useValue: { back: vi.fn() } },
    ] });
    component = TestBed.runInInjectionContext(() => new CompanyProfileComponent());
  });

  it('henter og gemmer adressen med resten af profilen', async () => {
    await component.ngOnInit();
    expect(component.form.controls.address.value).toBe(profile.address);
    component.form.controls.address.setValue('Nyvej 2\n9000 Aalborg');
    await component.save();
    expect(service.updateCurrentCompanyProfile).toHaveBeenCalledWith({
      ...profile, address: 'Nyvej 2\n9000 Aalborg',
    });
  });

  it('afviser manglende adresse, ugyldigt CVR og ugyldig e-mail', async () => {
    await component.ngOnInit();
    for (const changes of [{ address: '   ' }, { cvr: '123' }, { email: 'ugyldig' }, { phone: '......' }, { defaultHourlyRate: -1 }]) {
      component.form.setValue(profile);
      component.form.patchValue(changes);
      await component.save();
      expect(component.form.invalid).toBe(true);
    }
    expect(service.updateCurrentCompanyProfile).not.toHaveBeenCalled();
  });

  it('beskytter mod dobbeltklik under gemning', async () => {
    await component.ngOnInit();
    let finish!: () => void;
    service.updateCurrentCompanyProfile.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const saving = component.save();
    await component.save();
    expect(service.updateCurrentCompanyProfile).toHaveBeenCalledTimes(1);
    finish();
    await saving;
    expect(component.isSaving()).toBe(false);
  });

  it('tillader ikke gemning, når profilen ikke kan hentes', async () => {
    service.getCurrentCompanyProfile.mockResolvedValue(null);
    await component.ngOnInit();
    await component.save();
    expect(component.hasProfile()).toBe(false);
    expect(service.updateCurrentCompanyProfile).not.toHaveBeenCalled();
  });
});
