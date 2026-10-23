import { ActivityService } from '../activity/activity.service';
import { Injectable, inject } from '@angular/core';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { OfferService } from './offer.service';

type OfferData = Awaited<ReturnType<OfferService['getOffer']>>;

@Injectable({ providedIn: 'root' })
export class OfferPdfService {
  private readonly activity = inject(ActivityService);
  private readonly ink = '#302C26';
  private readonly muted = '#766F64';
  private readonly gold = '#9B7A3C';
  private readonly border = '#E7E2D9';
  private readonly cream = '#F7F3EA';
  private readonly margin = 44;

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
    const content: Content[] = [this.letterhead(data), this.parties(data)];
    for (const [title, description] of [
      ['Projektbeskrivelse', offer.project_description],
      ['Tilbudsbeskrivelse', offer.offer_description],
    ] as const) {
      if (description?.trim())
        content.push(
          { text: title, fontSize: 12, bold: true, headlineLevel: 1, margin: [0, 10, 0, 10] },
          { text: description, color: this.muted, lineHeight: 1.5, margin: [0, 0, 0, 20] },
        );
    }
    if (data.workItems.length) content.push(this.workItemsTable(data));
    if (data.materials.length) content.push(this.materialsTable(data));
    const closingStart = content.length;
    content.push(
      {
        unbreakable: true,
        stack: [
          { text: 'Tilbudsbetingelser', fontSize: 13, bold: true, margin: [0, 0, 0, 12] },
          { text: 'GYLDIGHED', style: 'eyebrow', margin: [0, 0, 0, 5] },
          {
            text:
              offer.validity_days == null
                ? 'Ikke angivet'
                : offer.validity_days + ' dage fra tilbudsdato',
          },
        ],
        margin: [0, 24, 0, 12],
      },
      this.termsBlock('BETALINGSBETINGELSER', offer.payment_terms || 'Ikke angivet'),
      this.termsBlock('FORBEHOLD', offer.reservations || 'Ingen angivet'),
    );
    content.push(this.pricing(data));
    if ((offer.payment_terms?.length ?? 0) + (offer.reservations?.length ?? 0) < 1000) {
      const closing = content.splice(closingStart);
      content.push({ stack: closing, unbreakable: true });
    }
    return {
      pageSize: 'A4',
      pageMargins: [this.margin, 48, this.margin, 58],
      info: {
        title: 'Tilbud ' + (offer.offer_number ?? ''),
        author: offer.company_name ?? 'Tak Makker',
        subject: offer.project_title ?? 'Tilbud',
      },
      defaultStyle: { font: 'Roboto', fontSize: 9.5, color: this.ink, lineHeight: 1.2 },
      styles: {
        eyebrow: { fontSize: 7.5, bold: true, color: this.gold, characterSpacing: 1.1 },
        tableHeader: { fontSize: 7, bold: true, color: this.muted },
        itemTitle: { fontSize: 9.5, bold: true },
        itemDescription: { fontSize: 8.5, color: this.muted, lineHeight: 1.25 },
        money: { fontSize: 9, bold: true },
      },
      content,
      pageBreakBefore: (node, queries) =>
        node.headlineLevel === 1 && queries.getFollowingNodesOnPage().length === 0,
      header: (page) =>
        page === 1
          ? { text: '' }
          : {
              margin: [this.margin, 20, this.margin, 0],
              fontSize: 7,
              color: this.muted,
              columns: [
                { text: offer.company_name ?? '', width: '*' },
                { text: 'Tilbud ' + (offer.offer_number ?? ''), alignment: 'right', width: 150 },
              ],
            },
      footer: (page, pages) => ({
        margin: [this.margin, 16, this.margin, 0],
        stack: [
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 507.28,
                y2: 0,
                lineWidth: 0.5,
                lineColor: this.border,
              },
            ],
            margin: [0, 0, 0, 8],
          },
          {
            columns: [
              { text: offer.company_name ?? '', width: '*' },
              { text: 'Tilbud ' + (offer.offer_number ?? ''), width: 130, alignment: 'center' },
              { text: 'Side ' + page + ' af ' + pages, width: 85, alignment: 'right' },
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
    const companyLines = [
      offer.company_name,
      offer.company_cvr ? 'CVR: ' + offer.company_cvr : null,
      offer.company_address,
      offer.company_contact_name,
      offer.company_phone,
      offer.company_email,
    ].filter((line): line is string => Boolean(line));
    return {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'TILBUDSDOKUMENT', style: 'eyebrow', margin: [0, 0, 0, 10] },
            {
              text: offer.project_title || 'Tilbud',
              fontSize: 22,
              bold: true,
              margin: [0, 0, 0, 12],
            },
            {
              text: 'Tilbudsnr. ' + (offer.offer_number ?? ''),
              color: this.muted,
              margin: [0, 0, 0, 4],
            },
            {
              text: 'Projektnr. ' + (offer.project_number ?? 'Ikke angivet'),
              color: this.muted,
              margin: [0, 0, 0, 4],
            },
            { text: 'Dato: ' + this.formatDate(offer.finalized_at), color: this.muted },
          ],
        },
        {
          width: 165,
          alignment: 'right',
          stack: [
            ...(offer.company_logo_data_url
              ? [
                  {
                    image: offer.company_logo_data_url,
                    fit: [130, 54],
                    alignment: 'right',
                    margin: [0, 0, 0, 10],
                  } as Content,
                ]
              : []),
            ...companyLines.map((text, index): Content => ({
              text,
              bold: index === 0,
              color: index === 0 ? this.ink : this.muted,
              fontSize: index === 0 ? 10 : 8,
              margin: [0, 0, 0, 4],
            })),
          ],
        },
      ],
      columnGap: 26,
      margin: [0, 0, 0, 22],
    };
  }

  private parties(data: OfferData): Content {
    return {
      stack: [
        { text: 'Kunde', fontSize: 12, bold: true, margin: [0, 0, 0, 10] },
        { text: data.offer.customer_name ?? '', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        { text: data.offer.customer_address ?? '', color: this.muted, lineHeight: 1.4 },
      ],
      margin: [0, 0, 0, 22],
    };
  }

  private workItemsTable(data: OfferData): Content {
    return this.itemTable(
      'Arbejde',
      'TIMER',
      'TIMEPRIS',
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
      'MÆNGDE',
      'ENHEDSPRIS',
      data.materials.map((item) => ({
        title: item.name ?? '',
        description: item.description,
        quantity: this.formatQuantity(item.quantity) + (item.unit ? ' ' + item.unit : ''),
        unitPrice: this.formatMoney(item.unit_price),
        price: item.total_price,
      })),
    );
  }

  private itemTable(
    title: string,
    quantityLabel: string,
    priceLabel: string,
    items: {
      title: string;
      description: string | null;
      quantity: string;
      unitPrice: string;
      price: number | null;
    }[],
  ): Content {
    const rows: TableCell[][] = items.map((item, index) => {
      const fillColor = index % 2 ? '#FCFBF8' : '#FFFFFF';
      return [
        {
          fillColor,
          stack: [
            { text: item.title, style: 'itemTitle' },
            ...(item.description
              ? [
                  {
                    text: item.description,
                    style: 'itemDescription',
                    margin: [0, 6, 0, 0],
                  } as Content,
                ]
              : []),
          ],
        },
        { text: item.quantity, alignment: 'right', fontSize: 8.5, color: this.muted, fillColor },
        { text: item.unitPrice, alignment: 'right', fontSize: 8.5, color: this.muted, fillColor },
        { text: this.formatMoney(item.price), alignment: 'right', style: 'money', fillColor },
      ];
    });
    return {
      table: {
        headerRows: 2,
        keepWithHeaderRows: 1,
        dontBreakRows: rows.every((row) => JSON.stringify(row).length < 1500),
        widths: ['*', 48, 76, 86],
        body: [
          [
            {
              text: [
                { text: title, bold: true, fontSize: 13 },
                { text: '   ' + items.length + ' poster', fontSize: 8, color: this.gold },
              ],
              colSpan: 4,
              margin: [0, 2, 0, 10],
            },
            {},
            {},
            {},
          ],
          ['BESKRIVELSE', quantityLabel, priceLabel, 'BELØB'].map((text, index): TableCell => ({
            text,
            style: 'eyebrow',
            fontSize: 6.5,
            characterSpacing: 0.6,
            alignment: index ? 'right' : 'left',
            fillColor: this.cream,
          })),
          ...rows,
        ],
      },
      layout: {
        hLineWidth: (i) => (i > 1 ? 0.4 : 0),
        hLineColor: () => this.border,
        vLineWidth: () => 0,
        paddingLeft: () => 9,
        paddingRight: () => 9,
        paddingTop: (i) => (i === 0 ? 0 : i === 1 ? 9 : 12),
        paddingBottom: (i) => (i === 0 ? 0 : i === 1 ? 9 : 12),
      },
      margin: [0, 6, 0, 20],
    };
  }

  private termsBlock(title: string, text: string): Content {
    return {
      unbreakable: text.length < 1000,
      stack: [
        { text: title, style: 'eyebrow', headlineLevel: 1, margin: [0, 0, 0, 5] },
        { text, lineHeight: 1.3 },
      ],
      margin: [0, 0, 0, 12],
    };
  }

  private pricing(data: OfferData): Content {
    const offer = data.offer;
    const row = (label: string, amount: number, total = false): TableCell[] => [
      {
        text: label,
        bold: total,
        color: total ? this.ink : this.muted,
        fillColor: total ? this.cream : undefined,
        fontSize: total ? 11 : 9.5,
      },
      {
        text: this.formatMoney(amount),
        alignment: 'right',
        bold: total,
        color: this.ink,
        fillColor: total ? this.cream : undefined,
        fontSize: total ? 16 : 10,
      },
    ];
    return {
      unbreakable: true,
      stack: [
        { text: 'Prisoversigt', fontSize: 12, bold: true, margin: [0, 0, 0, 12] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 150],
            body: [
              [
                { text: 'POST', style: 'eyebrow', fillColor: this.cream },
                { text: 'BELØB', style: 'eyebrow', alignment: 'right', fillColor: this.cream },
              ],
              row('Arbejde', offer.pricing_labor),
              row('Materialer', offer.pricing_materials),
              row('Subtotal ekskl. moms', offer.pricing_subtotal),
              row(
                'Moms (' + this.formatQuantity(offer.pricing_vat_rate * 100) + '%)',
                offer.pricing_vat_amount,
              ),
              row('I alt inkl. moms', offer.pricing_total, true),
            ],
          },
          layout: {
            hLineWidth: (i) => (i === 3 || i === 5 ? 0.8 : i === 0 ? 0 : 0.4),
            hLineColor: (i) => (i === 5 ? '#CCB98F' : this.border),
            vLineWidth: () => 0,
            paddingLeft: () => 12,
            paddingRight: () => 12,
            paddingTop: (i) => (i === 5 ? 14 : 10),
            paddingBottom: (i) => (i === 5 ? 14 : 10),
          },
        },
      ],
      margin: [0, 18, 0, 0],
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
