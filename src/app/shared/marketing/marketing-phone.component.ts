import { Component } from '@angular/core';
import { PublicBrandComponent } from '../components/public-brand/public-brand.component';
import { WorkspaceIcon } from '../components/workspace-icon.component';

@Component({
  selector: 'app-marketing-phone',
  imports: [PublicBrandComponent, WorkspaceIcon],
  template: `
    <div class="marketing-phone" aria-label="Illustrativt eksempel på arbejdsopgaver på mobil">
      <div class="phone-status"><b>09.41</b><span>● ▰</span></div>
      <div class="phone-island" aria-hidden="true"></div>
      <app-public-brand [tagline]="false" />
      <div class="phone-project"><app-workspace-icon name="projects" />2026-0026 · Renovering af badeværelse</div>
      <div class="phone-tabs"><span><app-workspace-icon name="chat" />Samtale</span><span class="selected"><app-workspace-icon name="tasks" />Opgaver</span><span><app-workspace-icon name="materials" />Materialer</span><span><app-workspace-icon name="offers" />Tilbud</span></div>
      <h3>Arbejdsopgaver <small>✓ 3 af 5</small></h3>
      <div class="phone-trade"><app-workspace-icon name="wrench" />VVS <small>3 opgaver</small></div>
      @for (item of items; track item.title) {
        <article><span class="phone-approved">✓ Godkendt</span><h4>{{ item.title }}</h4><div class="phone-amount"><span>◷ {{ item.hours }} t</span><b>{{ item.price }} kr.</b><span class="phone-reject">Afvis</span></div></article>
      }
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }
    .marketing-phone { position: relative; padding: 20px 18px 34px; border: 7px solid #222; border-radius: 48px; background: #fffaf3; color: #062e25; box-shadow: inset 0 0 0 2px #b7b7ad, 12px 16px 0 #141f1d, 0 26px 60px #0007; font-family: 'Marketing Inter', Arial, sans-serif; }
    .phone-status { display: flex; justify-content: space-between; font-size: 11px; padding: 0 7px 22px; }
    .phone-island { position: absolute; width: 96px; height: 24px; border-radius: 20px; background: #111; top: 11px; left: calc(50% - 48px); }
    app-public-brand { transform: scale(.77); transform-origin: left; height: 46px; }
    .phone-project { display: flex; align-items: center; gap: 6px; padding: 9px 5px; border: 1px solid #e2ddd4; border-radius: 7px; font-size: 9px; }
    app-workspace-icon { width: 19px; height: 19px; }
    .phone-tabs { display: flex; justify-content: space-between; gap: 5px; margin: 9px 0 18px; }
    .phone-tabs > span { display: grid; justify-items: center; gap: 5px; font-size: 10px; padding: 7px; }
    .phone-tabs .selected { background: #dfe9d1; border-bottom: 2px solid #07513a; border-radius: 8px 8px 0 0; }
    h3 { display: flex; align-items: center; justify-content: space-between; font-size: 18px; margin: 0 0 14px; }
    small { font-size: 10px; font-weight: 500; }
    h3 small { border-radius: 18px; background: #e1ebd6; padding: 7px; }
    .phone-trade { display: flex; align-items: center; gap: 8px; padding: 8px; background: #dde9d1; border-radius: 6px; font-size: 13px; font-weight: 700; }
    .phone-trade small { margin-left: auto; }
    article { padding: 14px 3px; border-bottom: 1px solid #e9e4db; }
    .phone-approved { font-size: 9px; background: #d7ecc3; border-radius: 8px; padding: 2px 6px; }
    h4 { font-size: 13px; line-height: 1.35; margin: 5px 0 12px; }
    .phone-amount { display: flex; align-items: center; justify-content: space-between; font-size: 11px; }
    .phone-reject { color: #c63b26; border: 1px solid #c63b26; padding: 3px 8px; border-radius: 5px; }
  `,
})
export class MarketingPhone {
  readonly items = [
    { title: 'Montering og tilslutning af 3 nye radiatorer', hours: '5', price: '3.330' },
    { title: 'Afmontering og bortskaffelse af 3 eksisterende radiatorer', hours: '2,5', price: '1.665' },
    { title: 'Tilpasning af rør og installationer', hours: '3', price: '1.998' },
  ];
}
