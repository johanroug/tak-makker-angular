import { ActivityService } from '../activity/activity.service';
import { Injectable, inject } from '@angular/core';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { OfferService } from './offer.service';

type OfferData = Awaited<ReturnType<OfferService['getOffer']>>;

@Injectable({ providedIn: 'root' })
export class OfferPdfService {
  private readonly activity = inject(ActivityService);
  private readonly ink = '#12372A';
  private readonly muted = '#526459';
  private readonly accent = '#E76F31';
  private readonly border = '#CCD6CD';
  private readonly cream = '#F6F1E7';
  private readonly sage = '#EDF2EA';
  private readonly margin = 48;

  async download(data: OfferData): Promise<void> {
    return this.activity.measure(
      'pdf_downloaded',
      async () => {
        const pdfMakeModule = await import('pdfmake/build/pdfmake');
        const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
        const pdfMake = pdfMakeModule.default;
        pdfMake.addVirtualFileSystem(pdfFontsModule.default);
        await pdfMake
          .createPdf(this.createDocument(data))
          .download('Tilbud-' + (data.offer.offer_number ?? data.offer.id) + '.pdf');
      },
      { offerId: data.offer.id },
    );
  }

  private createDocument(data: OfferData): TDocumentDefinitions {
    const offer = data.offer;
    const content: Content[] = [
      this.letterhead(data),
      { text: offer.project_title || 'Tilbud', fontSize: 23, bold: true, margin: [0, 0, 0, 8] },
    ];
    if (offer.offer_description?.trim()) {
      content.push({
        text: offer.offer_description,
        color: this.muted,
        lineHeight: 1.25,
        margin: [0, 0, 0, 16],
      });
    }
    content.push(this.parties(data));
    if (offer.project_description?.trim()) {
      content.push(
        { text: 'OM OPGAVEN', style: 'eyebrow', headlineLevel: 1, margin: [0, 0, 0, 7] },
        { text: offer.project_description, lineHeight: 1.25, margin: [0, 0, 0, 18] },
      );
    }
    if (data.workItems.length) content.push(this.workItemsTable(data));
    if (data.materials.length) content.push(this.materialsTable(data));
    const terms: Content = {
      stack: [
        { text: 'BETINGELSER', style: 'eyebrow', margin: [0, 0, 0, 9] },
        this.termsBlock('BETALING', offer.payment_terms || 'Ikke angivet'),
        this.termsBlock('FORBEHOLD', offer.reservations || 'Ingen angivet'),
        this.termsBlock(
          'GYLDIGHED',
          offer.validity_days == null
            ? 'Ikke angivet'
            : offer.validity_days + ' dage fra tilbudsdato',
        ),
      ],
    };
    // Short terms sit beside the total; lengthy terms flow across pages at full width.
    const shortTerms = (offer.payment_terms?.length ?? 0) + (offer.reservations?.length ?? 0) < 450;
    if (shortTerms) {
      content.push({
        unbreakable: true,
        columns: [
          { width: '*', stack: [terms] },
          { width: 240, stack: [this.pricing(data)] },
        ],
        columnGap: 26,
        margin: [0, 8, 0, 0],
      });
    } else {
      content.push(
        { stack: [terms], margin: [0, 8, 0, 0] },
        {
          columns: [
            { width: '*', text: '' },
            { width: 260, stack: [this.pricing(data)] },
          ],
          margin: [0, 10, 0, 0],
        },
      );
    }
    return {
      pageSize: 'A4',
      pageMargins: [this.margin, 40, this.margin, 55],
      info: {
        title: 'Tilbud ' + (offer.offer_number ?? ''),
        author: offer.company_name ?? 'Hovedet på sømmet',
        subject: offer.project_title ?? 'Tilbud',
      },
      defaultStyle: { font: 'Roboto', fontSize: 9, color: this.ink, lineHeight: 1.15 },
      styles: {
        eyebrow: { fontSize: 7, bold: true, color: this.ink, characterSpacing: 0.35 },
        tableHeader: { fontSize: 7, bold: true, color: this.muted },
        itemTitle: { fontSize: 9, bold: true },
        itemDescription: { fontSize: 8.5, color: this.muted, lineHeight: 1.2 },
        money: { fontSize: 9, bold: true },
      },
      content,
      pageBreakBefore: (node, queries) =>
        node.headlineLevel === 1 && queries.getFollowingNodesOnPage().length === 0,
      header: (page) =>
        page === 1
          ? { text: '' }
          : {
              margin: [this.margin, 17, this.margin, 0],
              fontSize: 7,
              color: this.muted,
              columns: [
                { text: offer.company_name ?? '', width: '*' },
                { text: 'Tilbud ' + (offer.offer_number ?? ''), alignment: 'right', width: 160 },
              ],
            },
      footer: (page, pages) => ({
        margin: [this.margin, 10, this.margin, 0],
        stack: [
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 499.28,
                y2: 0,
                lineWidth: 0.5,
                lineColor: this.border,
              },
            ],
            margin: [0, 0, 0, 8],
          },
          {
            columns: [
              {
                text:
                  [offer.company_phone, offer.company_email].filter(Boolean).join('  ·  ') ||
                  offer.company_name ||
                  '',
                width: '*',
              },
              {
                text: 'Tilbud ' + (offer.offer_number ?? '') + '  ·  Side ' + page + ' af ' + pages,
                width: 190,
                alignment: 'right',
              },
            ],
            fontSize: 7,
            color: this.muted,
          },
        ],
      }),
    };
  }

  private letterhead(data: OfferData): Content {
    const offer = data.offer;
    const company: Content[] = [
      { text: offer.company_name || 'Afsender', fontSize: 13, bold: true, margin: [0, 0, 0, 5] },
      {
        text: [offer.company_contact_name, offer.company_cvr ? 'CVR ' + offer.company_cvr : null]
          .filter(Boolean)
          .join('  ·  '),
        fontSize: 8,
        color: this.muted,
        margin: [0, 0, 0, 4],
      },
    ];
    if (offer.company_address)
      company.push({ text: offer.company_address, fontSize: 8, color: this.muted });
    return {
      stack: [
        {
          columns: [
            ...(offer.company_logo_data_url
              ? [{ image: offer.company_logo_data_url, fit: [58, 44], width: 58 } as Content]
              : []),
            { width: '*', stack: company },
            {
              width: 143,
              alignment: 'right',
              stack: [
                { text: 'TILBUD', style: 'eyebrow', margin: [0, 0, 0, 6] },
                { text: offer.offer_number ?? '', fontSize: 12, bold: true, margin: [0, 0, 0, 5] },
                { text: this.formatDate(offer.finalized_at), fontSize: 8, color: this.muted },
              ],
            },
          ],
          columnGap: 12,
          margin: [0, 0, 0, 15],
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 499.28,
              y2: 0,
              lineWidth: 0.5,
              lineColor: this.border,
            },
            { type: 'line', x1: 0, y1: 0, x2: 64, y2: 0, lineWidth: 3, lineColor: this.accent },
          ],
        },
      ],
      margin: [0, 0, 0, 18],
    };
  }

  private parties(data: OfferData): Content {
    const offer = data.offer;
    return {
      table: {
        widths: ['*', '*'],
        body: [
          [
            {
              stack: [
                { text: 'TIL', style: 'eyebrow', color: this.muted, margin: [0, 0, 0, 6] },
                {
                  text: offer.customer_name || 'Kunde ikke angivet',
                  fontSize: 10,
                  bold: true,
                  margin: [0, 0, 0, 4],
                },
                {
                  text: offer.customer_address || 'Adresse ikke angivet',
                  color: this.muted,
                  fontSize: 8.5,
                },
              ],
            },
            {
              stack: [
                { text: 'PROJEKT', style: 'eyebrow', color: this.muted, margin: [0, 0, 0, 6] },
                {
                  text: offer.project_number || 'Ikke angivet',
                  fontSize: 10,
                  bold: true,
                  margin: [0, 0, 0, 4],
                },
                {
                  text:
                    offer.validity_days == null
                      ? 'Gyldighed ikke angivet'
                      : 'Gyldigt i ' + offer.validity_days + ' dage fra tilbudsdato',
                  fontSize: 8.5,
                  color: this.muted,
                },
              ],
            },
          ],
        ],
      },
      layout: {
        fillColor: () => this.cream,
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 13,
        paddingRight: () => 13,
        paddingTop: () => 12,
        paddingBottom: () => 12,
      },
      unbreakable: true,
      margin: [0, 0, 0, 18],
    };
  }

  private workItemsTable(data: OfferData): Content {
    return this.itemTable(
      'Arbejde',
      'OPGAVE',
      'TIMER',
      'KR./TIME',
      data.offer.pricing_labor,
      data.workItems.map((item) => ({
        title: item.trade ?? '',
        description: item.description,
        quantity: this.formatQuantity(item.estimated_hours),
        unitPrice: this.formatMoney(item.hourly_rate),
        price: item.total_price,
      })),
    );
  }

  private materialsTable(data: OfferData): Content {
    return this.itemTable(
      'Materialer',
      'MATERIALE',
      'ANTAL',
      'KR./ENHED',
      data.offer.pricing_materials,
      data.materials.map((item) => ({
        title: item.name ?? '',
        quantity: this.formatQuantity(item.quantity) + (item.unit ? ' ' + item.unit : ''),
        unitPrice: this.formatMoney(item.unit_price),
        price: item.total_price,
      })),
    );
  }

  private itemTable(
    title: string,
    firstLabel: string,
    quantityLabel: string,
    priceLabel: string,
    subtotal: number,
    items: {
      title: string;
      description?: string | null;
      quantity: string;
      unitPrice: string;
      price: number | null;
    }[],
  ): Content {
    const rows: TableCell[][] = items.map((item) => [
      {
        stack: [
          { text: item.title, style: 'itemTitle' },
          ...(item.description
            ? [
                {
                  text: item.description,
                  style: 'itemDescription',
                  margin: [0, 5, 0, 0],
                } as Content,
              ]
            : []),
        ],
      },
      { text: item.quantity, alignment: 'right', fontSize: 8.5 },
      { text: item.unitPrice, alignment: 'right', fontSize: 8.5 },
      { text: this.formatMoney(item.price), alignment: 'right', style: 'money' },
    ]);
    return {
      table: {
        headerRows: 2,
        keepWithHeaderRows: 1,
        // Very long descriptions must be allowed to flow instead of overflowing a page.
        dontBreakRows: items.every(
          (item) => item.title.length + (item.description?.length ?? 0) < 900,
        ),
        widths: ['*', 56, 80, 85],
        body: [
          [
            {
              colSpan: 4,
              columns: [
                {
                  width: 3,
                  canvas: [{ type: 'rect', x: 0, y: 0, w: 3, h: 13, color: this.accent }],
                },
                { width: '*', text: title, fontSize: 12, bold: true },
                {
                  width: 120,
                  text: this.formatMoney(subtotal),
                  fontSize: 9,
                  bold: true,
                  alignment: 'right',
                },
              ],
              columnGap: 8,
              margin: [0, 0, 0, 10],
            },
            {},
            {},
            {},
          ],
          [firstLabel, quantityLabel, priceLabel, 'BELØB'].map((text, index): TableCell => ({
            text,
            style: 'tableHeader',
            alignment: index ? 'right' : 'left',
            fillColor: this.sage,
          })),
          ...rows,
        ],
      },
      layout: {
        hLineWidth: (i) => (i > 2 ? 0.45 : 0),
        hLineColor: () => this.border,
        vLineWidth: () => 0,
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: (i) => (i === 0 ? 0 : i === 1 ? 7 : 8),
        paddingBottom: (i) => (i === 0 ? 0 : i === 1 ? 7 : 8),
      },
      margin: [0, 0, 0, 18],
    };
  }

  private termsBlock(title: string, text: string): Content {
    return {
      stack: [
        {
          text: title,
          style: 'eyebrow',
          color: this.muted,
          headlineLevel: 1,
          margin: [0, 0, 0, 4],
        },
        { text, fontSize: 8, color: this.muted, lineHeight: 1.2 },
      ],
      margin: [0, 0, 0, 9],
    };
  }

  private pricing(data: OfferData): Content {
    const offer = data.offer;
    return {
      unbreakable: true,
      table: {
        widths: ['*', 104],
        body: [
          [
            { text: 'Subtotal ekskl. moms', fontSize: 8.5, color: this.muted },
            {
              text: this.formatMoney(offer.pricing_subtotal),
              fontSize: 9,
              bold: true,
              alignment: 'right',
            },
          ],
          [
            {
              text: 'Moms (' + this.formatQuantity(offer.pricing_vat_rate * 100) + ' %)',
              fontSize: 8.5,
              color: this.muted,
            },
            { text: this.formatMoney(offer.pricing_vat_amount), fontSize: 9, alignment: 'right' },
          ],
          [
            {
              colSpan: 2,
              fillColor: this.ink,
              stack: [
                {
                  text: 'I ALT INKL. MOMS',
                  fontSize: 7,
                  bold: true,
                  color: '#DBE6DA',
                  margin: [0, 0, 0, 7],
                },
                {
                  text: this.formatMoney(offer.pricing_total),
                  fontSize: 19,
                  bold: true,
                  color: '#FFFFFF',
                  alignment: 'right',
                },
              ],
            },
            {},
          ],
        ],
      },
      layout: {
        fillColor: () => this.cream,
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 12,
        paddingRight: () => 12,
        paddingTop: (i) => (i === 0 || i === 2 ? 12 : 5),
        paddingBottom: (i) => (i === 1 || i === 2 ? 12 : 5),
      },
    };
  }

  private formatMoney(value: number | null): string {
    if (value == null) return 'Ikke angivet';
    return (
      new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        value,
      ) + ' kr.'
    );
  }
  private formatQuantity(value: number | null): string {
    if (value == null) return 'Ikke angivet';
    return new Intl.NumberFormat('da-DK', { maximumFractionDigits: 2 }).format(value);
  }
  private formatDate(value: string | null): string {
    if (!value) return 'Ikke angivet';
    return new Intl.DateTimeFormat('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }
}
