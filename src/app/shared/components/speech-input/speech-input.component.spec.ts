import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpeechInput } from './speech-input.component';
import { BillingService } from '../../../core/billing/billing.service';

describe('Microphone permission guidance', () => {
  const getUserMedia = vi.fn();
  beforeEach(async () => {
    getUserMedia.mockReset();
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Safari/537.36', platform: 'Linux', maxTouchPoints: 5, mediaDevices: { getUserMedia } });
    vi.stubGlobal('MediaRecorder', class {});
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    await TestBed.configureTestingModule({ imports: [SpeechInput], providers: [{ provide: BillingService, useValue: {} }] }).compileComponents();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

  it('shows device-specific help after denial and clears it on retry without starting a recording', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    const fixture = TestBed.createComponent(SpeechInput);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const busy = vi.fn();
    component.busyChange.subscribe(busy);
    await component.start();
    fixture.detectChanges();
    expect(component.permissionGuide()).toBe('android');
    expect(component.permissionDenied()).toBe(true);
    expect(component.state()).toBe('idle');
    expect(busy).toHaveBeenLastCalledWith(false);
    const help = (fixture.nativeElement as HTMLElement).querySelector('.microphone-help')!;
    expect(help.textContent).toContain('Websiteindstillinger → Mikrofon');
    expect(help.querySelectorAll('details[open]')).toHaveLength(1);
    getUserMedia.mockRejectedValueOnce(new DOMException('No device', 'NotFoundError'));
    await component.start();
    expect(component.permissionDenied()).toBe(false);
    expect(component.error()).toContain('tilsluttet og ledig');
  });

  it('uses Safari guidance on iPhone without treating a missing device as a permission failure', async () => {
    Object.assign(navigator, { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
    getUserMedia.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    const fixture = TestBed.createComponent(SpeechInput);
    fixture.detectChanges();
    await fixture.componentInstance.start();
    expect(fixture.componentInstance.permissionGuide()).toBe('safari');
  });

  it('opens Chrome-specific iPhone instructions instead of the generic address-bar guide', async () => {
    Object.assign(navigator, { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
    getUserMedia.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    const fixture = TestBed.createComponent(SpeechInput);
    fixture.detectChanges();
    await fixture.componentInstance.start();
    fixture.detectChanges();
    expect(fixture.componentInstance.permissionGuide()).toBe('chrome-ios');
    const openGuide = (fixture.nativeElement as HTMLElement).querySelector('details[open]')!;
    expect(openGuide.textContent).toContain('Indstillinger → Apps → Chrome');
    expect(openGuide.textContent).not.toContain('Tryk på ikonet til venstre');
  });
});
