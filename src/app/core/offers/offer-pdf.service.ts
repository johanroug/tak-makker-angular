import { Injectable } from '@angular/core';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

import type { OfferService } from './offer.service';

type OfferData = Awaited<ReturnType<OfferService['getOffer']>>;

@Injectable({
  providedIn: 'root',
})
export class OfferPdfService {
  private readonly charcoal = '#414145';
  private readonly charcoalDark = '#303034';
  private readonly text = '#262626';
  private readonly muted = '#666666';
  private readonly border = '#d9d9d9';
  private readonly light = '#f3f3f3';
  private readonly white = '#ffffff';

  private readonly pageWidth = 595.28;
  private readonly margin = 38;

  async download(data: OfferData): Promise<void> {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

    const pdfMake = pdfMakeModule.default;
    const pdfFonts = pdfFontsModule.default;

    pdfMake.addVirtualFileSystem(pdfFonts);

    const document = this.createDocument(data);
    const offerNumber = data.offer.offer_number ?? data.offer.id;

    pdfMake.createPdf(document).download(`Tilbud-${offerNumber}.pdf`);
  }

  private createDocument(data: OfferData): TDocumentDefinitions {
    const offer = data.offer;

    const content: Content[] = [this.documentHeader(data), this.metaInformation(data)];

    const description = offer.offer_description?.trim() || offer.project_description?.trim();

    if (description) {
      content.push(
        {
          text: 'PROJEKTBESKRIVELSE',
          style: 'sectionHeading',
          margin: [0, 0, 0, 6],
        },
        {
          text: description,
          fontSize: 9,
          lineHeight: 1.2,
          margin: [0, 0, 0, 12],
        },
      );
    }

    if (data.workItems.length > 0) {
      content.push(this.sectionBar('ARBEJDE'), this.workItemsTable(data));
    }

    if (data.materials.length > 0) {
      content.push(this.sectionBar('MATERIALER'), this.materialsTable(data));
    }

    content.push(this.pricingAndTerms(data));
    content.push(
      { text: 'TILBUDSBETINGELSER', style: 'sectionHeading', margin: [0, 18, 0, 6] },
      { text: `Gyldighed: ${offer.validity_days == null ? 'Ikke angivet' : offer.validity_days + ' dage fra tilbudsdato'}`, margin: [0, 0, 0, 6] },
      { text: 'Betalingsbetingelser', bold: true },
      { text: offer.payment_terms || 'Ikke angivet', margin: [0, 0, 0, 6] },
      { text: 'Forbehold', bold: true },
      { text: offer.reservations || 'Ingen angivet' },
    );

    return {
      pageSize: 'A4',
      pageMargins: [this.margin, 0, this.margin, 42],

      info: {
        title: `Tilbud ${offer.offer_number ?? ''}`,
        author: offer.company_name ?? 'Tak Makker',
        subject: offer.project_title ?? 'Tilbud',
      },

      content,

      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
        color: this.text,
        lineHeight: 1.15,
      },

      styles: {
        sectionHeading: {
          fontSize: 9,
          bold: true,
          color: this.charcoal,
        },
        tableHeader: {
          fontSize: 8,
          bold: true,
          color: this.white,
        },
        itemTitle: {
          fontSize: 8.5,
          bold: true,
        },
        itemDescription: {
          fontSize: 7.5,
          color: this.muted,
        },
        money: {
          fontSize: 8.5,
          bold: true,
        },
      },

      footer: (currentPage, pageCount) => ({
        margin: [this.margin, 0, this.margin, 0],
        columns: [
          {
            text: offer.company_name ?? '',
            color: this.muted,
          },
          {
            text: `Tilbud ${offer.offer_number ?? ''}`,
            alignment: 'center',
            color: this.muted,
          },
          {
            text: `${currentPage} / ${pageCount}`,
            alignment: 'right',
            color: this.muted,
          },
        ],
        fontSize: 7,
      }),
    };
  }

  private documentHeader(data: OfferData): Content {
    const offer = data.offer;

    return {
      margin: [-this.margin, 0, -this.margin, 0],
      table: {
        widths: [this.pageWidth * 0.68, '*'],
        body: [
          [
            {
              fillColor: this.charcoal,
              stack: [
                {
                  text: 'TILBUD',
                  fontSize: 27,
                  bold: true,
                  color: this.white,
                  characterSpacing: 3,
                },
                {
                  text: offer.project_title ?? '',
                  fontSize: 10,
                  color: '#dddddd',
                  margin: [0, 12, 0, 0],
                },
              ],
              margin: [this.margin + 8, 35, 15, 33],
            },
            {
              fillColor: this.charcoalDark,
              stack: [
                {
                  text: offer.company_name ?? '',
                  fontSize: 13,
                  bold: true,
                  color: this.white,
                  alignment: 'center',
                },
                {
                  text: offer.company_cvr ? `CVR ${offer.company_cvr}` : '',
                  fontSize: 8,
                  color: '#dddddd',
                  alignment: 'center',
                  margin: [0, 8, 0, 0],
                },
              ],
              margin: [12, 39, 12, 30],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    };
  }

  private metaInformation(data: OfferData): Content {
    const offer = data.offer;

    return {
      margin: [0, 16, 0, 14],
      columns: [
        {
          width: '*',
          stack: [
            this.boxHeading('KUNDE'),
            {
              text: offer.customer_name ?? '',
              bold: true,
              fontSize: 10,
              margin: [8, 8, 8, 3],
            },
            {
              text: offer.customer_address ?? '',
              fontSize: 8.5,
              color: this.muted,
              margin: [8, 0, 8, 6],
            },
          ],
        },
        {
          width: '*',
          stack: [
            this.boxHeading('VIRKSOMHED'),
            {
              text: offer.company_name ?? '',
              bold: true,
              fontSize: 10,
              margin: [8, 8, 8, 3],
            },
            ...this.companyLines(data),
          ],
        },
      ],
      columnGap: 18,
    };
  }

  private companyLines(data: OfferData): Content[] {
    const offer = data.offer;

    const lines = [offer.company_contact_name, offer.company_phone, offer.company_email].filter(
      (value): value is string => Boolean(value),
    );

    return lines.map((line): Content => ({
      text: line,
      fontSize: 8,
      color: this.muted,
      margin: [8, 0, 8, 2],
    }));
  }

  private boxHeading(title: string): Content {
    return {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: title,
              bold: true,
              color: this.white,
              fontSize: 8,
              fillColor: this.charcoal,
              margin: [8, 5, 8, 5],
            },
          ],
        ],
      },
      layout: 'noBorders',
    };
  }

  private sectionBar(title: string): Content {
    return {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: title,
              bold: true,
              color: this.white,
              fontSize: 9,
              fillColor: this.charcoal,
              margin: [10, 6, 10, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 5, 0, 0],
    };
  }

  private workItemsTable(data: OfferData): Content {
    const rows: TableCell[][] = [
      this.tableHeader(['BESKRIVELSE', 'TIMER', 'TIMEPRIS', 'TOTAL']),
      ...data.workItems.map((item): TableCell[] => [
        {
          stack: [
            {
              text: item.trade ?? '',
              style: 'itemTitle',
            },
            {
              text: item.description ?? '',
              style: 'itemDescription',
              margin: [0, 3, 0, 0],
            },
          ],
        },
        {
          text: this.formatQuantity(item.estimated_hours),
          alignment: 'right',
        },
        {
          text: this.formatMoney(item.hourly_rate),
          alignment: 'right',
        },
        {
          text: this.formatMoney(item.total_price),
          alignment: 'right',
          style: 'money',
        },
      ]),
    ];

    return this.itemTable(rows);
  }

  private materialsTable(data: OfferData): Content {
    const rows: TableCell[][] = [
      this.tableHeader(['BESKRIVELSE', 'ANTAL', 'ENHEDSPRIS', 'TOTAL']),
      ...data.materials.map((item): TableCell[] => [
        {
          stack: [
            {
              text: item.name ?? '',
              style: 'itemTitle',
            },
            {
              text: item.description ?? '',
              style: 'itemDescription',
              margin: [0, 3, 0, 0],
            },
            {
              text: item.unit ?? '',
              style: 'itemDescription',
              margin: [0, 2, 0, 0],
            },
          ],
        },
        {
          text: this.formatQuantity(item.quantity),
          alignment: 'right',
        },
        {
          text: this.formatMoney(item.unit_price),
          alignment: 'right',
        },
        {
          text: this.formatMoney(item.total_price),
          alignment: 'right',
          style: 'money',
        },
      ]),
    ];

    return this.itemTable(rows);
  }

  private tableHeader(labels: string[]): TableCell[] {
    return labels.map((label, index): TableCell => ({
      text: label,
      style: 'tableHeader',
      fillColor: this.charcoal,
      alignment: index === 0 ? 'left' : 'right',
    }));
  }

  private itemTable(rows: TableCell[][]): Content {
    return {
      table: {
        headerRows: 1,
        widths: ['*', 43, 85, 95],
        dontBreakRows: true,
        keepWithHeaderRows: 1,
        body: rows,
      },
      layout: {
        fillColor: (rowIndex: number) => (rowIndex > 0 && rowIndex % 2 === 0 ? this.light : null),
        hLineWidth: (index: number) => (index === 0 ? 0 : 0.5),
        hLineColor: () => this.border,
        vLineWidth: () => 0,
        paddingTop: (rowIndex: number) => (rowIndex === 0 ? 7 : 8),
        paddingBottom: (rowIndex: number) => (rowIndex === 0 ? 7 : 8),
        paddingLeft: () => 8,
        paddingRight: () => 8,
      },
      margin: [0, 0, 0, 10],
    };
  }

  private pricingAndTerms(data: OfferData): Content {
    const offer = data.offer;

    return {
      unbreakable: true,
      margin: [0, 10, 0, 0],
      columns: [
        {
          width: '*',
          stack: [
            {
              text: 'TILBUDSOPLYSNINGER',
              style: 'sectionHeading',
              margin: [0, 0, 0, 9],
            },
            {
              text: `Tilbudsnummer: ${offer.offer_number ?? ''}`,
              fontSize: 8,
              margin: [0, 0, 0, 4],
            },
            {
              text: `Projektnummer: ${offer.project_number ?? ''}`,
              fontSize: 8,
              margin: [0, 0, 0, 4],
            },
            {
              text: `Dato: ${this.formatDate(offer.finalized_at)}`,
              fontSize: 8,
            },
          ],
        },
        {
          width: 240,
          stack: [
            this.totalRow('Subtotal', offer.pricing_subtotal),
            this.totalRow(
              `Moms (${this.formatQuantity((offer.pricing_vat_rate ?? 0) * 100)}%)`,
              offer.pricing_vat_amount,
            ),
            {
              table: {
                widths: ['*', 130],
                body: [
                  [
                    {
                      text: 'I ALT INKL. MOMS',
                      bold: true,
                      color: this.white,
                      fillColor: this.charcoal,
                      margin: [8, 8, 0, 8],
                    },
                    {
                      text: this.formatMoney(offer.pricing_total),
                      bold: true,
                      color: this.white,
                      alignment: 'right',
                      fillColor: this.charcoal,
                      margin: [0, 8, 8, 8],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 8, 0, 0],
            },
          ],
        },
      ],
      columnGap: 25,
    };
  }

  private totalRow(label: string, amount: number | null): Content {
    return {
      columns: [
        {
          text: label,
          fontSize: 8.5,
        },
        {
          text: this.formatMoney(amount),
          alignment: 'right',
          fontSize: 8.5,
          bold: true,
        },
      ],
      margin: [0, 0, 0, 7],
    };
  }

  private formatMoney(value: number | null): string {
    if (value === null || value === undefined) {
      return 'Ikke angivet';
    }

    return `${new Intl.NumberFormat('da-DK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} kr.`;
  }

  private formatQuantity(value: number | null): string {
    if (value === null || value === undefined) {
      return 'Ikke angivet';
    }

    return new Intl.NumberFormat('da-DK', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatDate(value: string | null): string {
    if (!value) {
      return 'Ikke angivet';
    }

    return new Intl.DateTimeFormat('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }
}
