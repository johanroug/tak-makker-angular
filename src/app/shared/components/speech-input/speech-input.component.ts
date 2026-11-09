import { Component, effect, inject, input, output, signal, OnDestroy } from '@angular/core';
import { supabase } from '../../../core/supabase/supabase.client';
import { BillingService } from '../../../core/billing/billing.service';

@Component({
  selector: 'app-speech-input',
  templateUrl: './speech-input.component.html',
  styleUrl: './speech-input.component.scss',
})
export class SpeechInput implements OnDestroy {
  readonly billing = inject(BillingService);
  readonly disabled = input(false);
  readonly companyId = input<string | undefined>();
  readonly context = input('');
  readonly textReady = output<string>();
  readonly busyChange = output<boolean>();
  readonly state = signal<'idle' | 'starting' | 'recording' | 'transcribing'>('idle');
  readonly error = signal('');
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private timer?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  private generation = 0;

  constructor() {
    effect(() => { if (this.disabled()) this.cancel(); });
    effect(() => { this.context(); this.cancel(); });
  }

  async start(): Promise<void> {
    if (this.disabled() || this.state() !== 'idle') return;
    this.error.set('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.error.set('Din browser understøtter ikke optagelse. Du kan stadig skrive din besked.');
      return;
    }
    const generation = ++this.generation;
    this.state.set('starting');
    this.busyChange.emit(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.destroyed || generation !== this.generation || this.disabled()) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this.stream = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.recorder = recorder;
      const chunks: Blob[] = [];
      let bytes = 0;
      recorder.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
        if (bytes > 8 * 1024 * 1024) {
          this.cancel();
          this.error.set('Optagelsen blev for stor. Prøv med en kortere besked.');
        }
      };
      recorder.onerror = () => {
        this.cancel();
        this.error.set('Optagelsen blev afbrudt. Prøv igen.');
      };
      recorder.onstop = () => {
        if (!this.destroyed && generation === this.generation) {
          this.release();
          void this.transcribe(new Blob(chunks, { type: recorder.mimeType }), generation);
        }
      };
      recorder.start(1000);
      this.state.set('recording');
      this.timer = setTimeout(() => this.stop(), 90_000);
    } catch (error) {
      if (this.destroyed || generation !== this.generation) return;
      this.cancel();
      this.error.set(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Tillad mikrofonen i browseren for at indtale din besked.'
        : 'Kunne ikke starte mikrofonen. Kontrollér, at den er tilsluttet og ledig.');
    }
  }

  stop(): void {
    if (this.recorder?.state === 'recording') {
      this.state.set('transcribing');
      this.recorder.stop();
      this.release();
    }
  }

  cancel(): void {
    this.generation++;
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.release();
    this.state.set('idle');
    if (!this.destroyed) this.busyChange.emit(false);
  }

  private release(): void {
    clearTimeout(this.timer);
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
  }

  private async transcribe(audio: Blob, generation: number): Promise<void> {
    this.state.set('transcribing');
    try {
      if (!audio.size) throw new Error('Der blev ikke optaget lyd. Prøv igen.');
      const body = new FormData();
      body.append('file', audio, audio.type.includes('mp4') ? 'recording.m4a' : 'recording.webm');
      if (this.companyId()) body.append('companyId', this.companyId()!);
      const billingVersion = this.billing.version;
      const { data, error } = await supabase.functions.invoke('transcribe-audio', { body });
      if (this.destroyed || generation !== this.generation) return;
      if (error) {
        const response = error.context instanceof Response ? await error.context.json().catch(() => null) : null;
        if (response?.usage && billingVersion === this.billing.version) this.billing.accept(response.usage, true);
        throw new Error(response?.error || 'Kunne ikke omsætte optagelsen til tekst. Prøv igen.');
      }
      if (typeof data?.text !== 'string' || !data.text.trim()) throw new Error('Vi kunne ikke høre nogen tale. Prøv igen.');
      if (data.usage && billingVersion === this.billing.version) this.billing.accept(data.usage, true);
      this.textReady.emit(data.text.trim());
    } catch (error) {
      if (!this.destroyed && generation === this.generation) this.error.set(error instanceof Error ? error.message : 'Optagelsen kunne ikke behandles.');
    } finally {
      if (!this.destroyed && generation === this.generation) {
        this.state.set('idle');
        this.busyChange.emit(false);
      }
    }
  }

  ngOnDestroy(): void { this.destroyed = true; this.cancel(); }
}
