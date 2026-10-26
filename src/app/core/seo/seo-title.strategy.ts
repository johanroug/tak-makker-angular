import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { BRAND_NAME, SITE_ORIGIN } from '../brand';

export interface PublicSeo {
  path: string;
  description: string;
}

@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const seo = route.data['seo'] as PublicSeo | undefined;
    const title = this.buildTitle(snapshot) ?? BRAND_NAME;
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'robots', content: seo ? 'index, follow' : 'noindex, follow' });

    if (!seo) {
      this.meta.removeTag('name="description"');
      this.document.querySelector('link[rel="canonical"]')?.remove();
      for (const property of [
        'og:title',
        'og:description',
        'og:url',
        'og:type',
        'og:site_name',
        'og:locale',
      ]) {
        this.meta.removeTag(`property="${property}"`);
      }
      return;
    }

    const url = SITE_ORIGIN + seo.path;
    this.meta.updateTag({ name: 'description', content: seo.description });
    let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = url;
    for (const [property, content] of Object.entries({
      'og:title': title,
      'og:description': seo.description,
      'og:url': url,
      'og:type': 'website',
      'og:site_name': BRAND_NAME,
      'og:locale': 'da_DK',
    }))
      this.meta.updateTag({ property, content });
  }
}
