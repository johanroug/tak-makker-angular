import { Injectable } from '@angular/core';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { OfferService } from './offer.service';

type OfferData = Awaited<ReturnType<OfferService['getOffer']>>;

@Injectable({ providedIn: 'root' })
export class OfferPdfService {
  private readonly ink = '#302C26';
  private readonly muted = '#766F64';
  private readonly gold = '#9B7A3C';
  private readonly border = '#E7E2D9';
  private readonly cream = '#F7F3EA';
  private readonly margin = 44;

  async download(data: OfferData): Promise<void> {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
    const pdfMake = pdfMakeModule.default;
    pdfMake.addVirtualFileSystem(pdfFontsModule.default);
    await pdfMake
      .createPdf(this.createDocument(data))
      .download('Tilbud-' + (data.offer.offer_number ?? data.offer.id) + '.pdf');
  }

  private createDocument(data: OfferData): TDocumentDefinitions {
    const offer = data.offer;
    const content: Content[] = [
      this.letterhead(data),
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 507.28, y2: 0, lineWidth: 1, lineColor: this.border },
        ],
        margin: [0, 18, 0, 22],
      },
      {
        text: offer.project_title || 'Tilbud',
        fontSize: 23,
        bold: true,
        lineHeight: 1.12,
        margin: [0, 0, 0, 18],
      },
      this.parties(data),
    ];
    const description = offer.offer_description?.trim() || offer.project_description?.trim();
    if (description)
      content.push(
        { text: 'OM OPGAVEN', style: 'eyebrow', headlineLevel: 1, margin: [0, 8, 0, 8] },
        { text: description, lineHeight: 1.35, margin: [0, 0, 0, 18] },
      );
    if (data.workItems.length) content.push(this.workItemsTable(data));
    if (data.materials.length) content.push(this.materialsTable(data));
    content.push(this.pricing(data));
    content.push(
      {
        unbreakable: true,
        stack: [
          { text: 'Aftalens rammer', fontSize: 13, bold: true, margin: [0, 0, 0, 12] },
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
    const brand: Content = offer.company_logo_data_url
      ? { image: offer.company_logo_data_url, fit: [150, 54], alignment: 'left' }
      : { text: offer.company_name ?? '', bold: true, fontSize: 17, margin: [0, 4, 0, 0] };
    return {
      columns: [
        { width: '*', stack: [brand] },
        {
          width: 165,
          alignment: 'right',
          stack: [
            { text: 'TILBUD', fontSize: 26, bold: true, color: this.gold, characterSpacing: 2 },
            { text: offer.offer_number ?? '', bold: true, fontSize: 10, margin: [0, 6, 0, 0] },
            {
              text: this.formatDate(offer.finalized_at),
              fontSize: 8,
              color: this.muted,
              margin: [0, 4, 0, 0],
            },
          ],
        },
      ],
      columnGap: 24,
    };
  }

  private parties(data: OfferData): Content {
    const offer = data.offer;
    const companyLines = [
      offer.company_address,
      offer.company_contact_name,
      offer.company_phone,
      offer.company_email,
      offer.company_cvr ? 'CVR ' + offer.company_cvr : null,
    ].filter((line): line is string => Boolean(line));
    return {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'TIL', style: 'eyebrow', margin: [0, 0, 0, 8] },
            { text: offer.customer_name ?? '', fontSize: 11, bold: true, margin: [0, 0, 0, 4] },
            { text: offer.customer_address ?? '', color: this.muted, lineHeight: 1.3 },
            {
              text: 'Projektnr. ' + (offer.project_number ?? 'Ikke angivet'),
              fontSize: 8,
              color: this.muted,
              margin: [0, 10, 0, 0],
            },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'FRA', style: 'eyebrow', margin: [0, 0, 0, 8] },
            { text: offer.company_name ?? '', fontSize: 11, bold: true, margin: [0, 0, 0, 4] },
            ...companyLines.map((text): Content => ({
              text,
              color: this.muted,
              fontSize: 8.5,
              margin: [0, 0, 0, 3],
            })),
          ],
        },
      ],
      columnGap: 44,
      margin: [0, 0, 0, 22],
    };
  }

  private workItemsTable(data: OfferData): Content {
    const rows: TableCell[][] = data.workItems.map((item) => [
      {
        stack: [
          { text: item.trade ?? '', style: 'itemTitle' },
          ...(item.description
            ? [
                {
                  text: item.description,
                  style: 'itemDescription',
                  margin: [0, 4, 0, 0],
                } satisfies Content,
              ]
            : []),
        ],
      },
      { text: this.formatQuantity(item.estimated_hours), alignment: 'right' },
      { text: this.formatMoney(item.hourly_rate), alignment: 'right' },
      { text: this.formatMoney(item.total_price), alignment: 'right', style: 'money' },
    ]);
    return this.itemTable('Arbejde', ['BESKRIVELSE', 'TIMER', 'TIMEPRIS', 'BELØB'], rows);
  }

  private materialsTable(data: OfferData): Content {
    const rows: TableCell[][] = data.materials.map((item) => [
      {
        stack: [
          { text: item.name ?? '', style: 'itemTitle' },
          ...(item.description
            ? [
                {
                  text: item.description,
                  style: 'itemDescription',
                  margin: [0, 4, 0, 0],
                } satisfies Content,
              ]
            : []),
        ],
      },
      {
        text: this.formatQuantity(item.quantity) + (item.unit ? ' ' + item.unit : ''),
        alignment: 'right',
      },
      { text: this.formatMoney(item.unit_price), alignment: 'right' },
      { text: this.formatMoney(item.total_price), alignment: 'right', style: 'money' },
    ]);
    return this.itemTable('Materialer', ['BESKRIVELSE', 'ANTAL', 'ENHEDSPRIS', 'BELØB'], rows);
  }

  private itemTable(title: string, labels: string[], rows: TableCell[][]): Content {
    return {
      table: {
        headerRows: 2,
        // Extremely long descriptions must be allowed to span pages.
        dontBreakRows: rows.every((row) => JSON.stringify(row).length < 1400),
        widths: ['*', 50, 82, 92],
        body: [
          [
            { text: title, colSpan: 4, bold: true, fontSize: 13, margin: [0, 6, 0, 10] },
            {},
            {},
            {},
          ],
          labels.map((text, index): TableCell => ({
            text,
            style: 'tableHeader',
            fillColor: this.cream,
            alignment: index ? 'right' : 'left',
          })),
          ...rows,
        ],
      },
      layout: {
        hLineWidth: (index) => (index < 2 ? 0 : index === 2 ? 0.8 : 0.4),
        hLineColor: (index) => (index === 2 ? '#D7C59F' : this.border),
        vLineWidth: () => 0,
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: (row) => (row === 0 ? 0 : row === 1 ? 7 : 9),
        paddingBottom: (row) => (row === 0 ? 0 : row === 1 ? 7 : 9),
      },
      margin: [0, 0, 0, 18],
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
    const row = (label: string, amount: number): TableCell[] => [
      { text: label, color: this.muted },
      { text: this.formatMoney(amount), alignment: 'right', bold: true },
    ];
    return {
      unbreakable: true,
      columns: [
        { width: '*', text: '' },
        {
          width: 295,
          stack: [
            {
              table: {
                widths: ['*', 122],
                body: [
                  row('Arbejde', offer.pricing_labor),
                  row('Materialer', offer.pricing_materials),
                  row('Subtotal', offer.pricing_subtotal),
                  row(
                    'Moms (' + this.formatQuantity(offer.pricing_vat_rate * 100) + '%)',
                    offer.pricing_vat_amount,
                  ),
                ],
              },
              layout: {
                hLineWidth: (i) => (i === 2 ? 0.5 : 0),
                hLineColor: () => this.border,
                vLineWidth: () => 0,
                paddingLeft: () => 10,
                paddingRight: () => 10,
                paddingTop: () => 6,
                paddingBottom: () => 6,
              },
            },
            {
              table: {
                widths: ['*', 138],
                body: [
                  [
                    {
                      text: 'I alt inkl. moms',
                      bold: true,
                      fontSize: 10,
                      fillColor: this.cream,
                      margin: [10, 12, 0, 12],
                    },
                    {
                      text: this.formatMoney(offer.pricing_total),
                      bold: true,
                      fontSize: 13,
                      alignment: 'right',
                      fillColor: this.cream,
                      margin: [0, 10, 10, 10],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 10, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 6, 0, 0],
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
