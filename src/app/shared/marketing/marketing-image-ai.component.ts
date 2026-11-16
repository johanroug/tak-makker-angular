import { Component } from '@angular/core';
import { WorkspaceIcon } from '../components/workspace-icon.component';

@Component({
  selector: 'app-marketing-image-ai',
  imports: [WorkspaceIcon],
  template: `<div class="hero-image-ai" role="img" aria-label="Fra billede til AI-forslag: Et foto af badeværelset bruges som input til opgaverne på telefonen. Illustrativt eksempel.">
          <div class="ai-photo-card" aria-hidden="true">
            <span class="ai-photo-caption"><app-workspace-icon name="camera" /> Billede af opgaven <app-workspace-icon class="ai-photo-check" name="checkCircle" /></span>
            <img src="/marketing/bathroom-ai-input.webp" width="480" height="360" alt="" decoding="async" />
            <span class="ai-photo-analysis"><app-workspace-icon name="sparkles" /> Analyseres med AI …</span>
            <span class="ai-photo-progress"><i></i></span>
          </div>
          <div class="ai-photo-connection" aria-hidden="true"><span></span><app-workspace-icon name="sparkles" /><span class="ai-photo-arrow"></span></div>
        </div>`,
  styleUrl: './marketing-image-ai.component.scss',
})
export class MarketingImageAi {}