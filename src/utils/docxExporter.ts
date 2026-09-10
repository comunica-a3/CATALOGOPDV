import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  HeightRule,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from 'docx';

/**
 * Parses CSS styles from a style attribute or computed properties
 */
interface ParsedStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string; // hex without #
  highlight?: string;
  fontFamily?: string;
  fontSizePt?: number;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  lineSpacing?: number;
  marginTop?: number;
  marginBottom?: number;
  textIndent?: number;
}

function parseStyleString(styleStr: string | null): ParsedStyles {
  const styles: ParsedStyles = {};
  if (!styleStr) return styles;

  const declarations = styleStr.split(';');
  for (const decl of declarations) {
    const [prop, val] = decl.split(':').map((s) => s?.trim().toLowerCase());
    if (!prop || !val) continue;

    if (prop === 'font-weight' && (val === 'bold' || val === '700' || val === '800' || val === '900')) {
      styles.bold = true;
    }
    if (prop === 'font-style' && (val === 'italic' || val === 'oblique')) {
      styles.italic = true;
    }
    if (prop === 'text-decoration') {
      if (val.includes('underline')) styles.underline = true;
      if (val.includes('line-through')) styles.strike = true;
    }
    if (prop === 'color') {
      const hex = colorToHex(val);
      if (hex) styles.color = hex;
    }
    if (prop === 'background-color' || prop === 'background') {
      const hex = colorToHex(val);
      if (hex) styles.highlight = hex;
    }
    if (prop === 'font-family') {
      styles.fontFamily = val.replace(/['"]/g, '').split(',')[0].trim();
    }
    if (prop === 'font-size') {
      const num = parseFloat(val);
      if (val.endsWith('pt')) styles.fontSizePt = num;
      else if (val.endsWith('px')) styles.fontSizePt = Math.round(num * 0.75);
      else if (val.endsWith('rem') || val.endsWith('em')) styles.fontSizePt = Math.round(num * 12);
      else if (!isNaN(num)) styles.fontSizePt = num;
    }
    if (prop === 'text-align') {
      if (val === 'center') styles.alignment = AlignmentType.CENTER;
      else if (val === 'right') styles.alignment = AlignmentType.RIGHT;
      else if (val === 'justify') styles.alignment = AlignmentType.JUSTIFIED;
      else styles.alignment = AlignmentType.LEFT;
    }
    if (prop === 'line-height') {
      const num = parseFloat(val);
      if (!isNaN(num)) styles.lineSpacing = num;
    }
  }

  return styles;
}

function colorToHex(colorStr: string): string | undefined {
  if (!colorStr) return undefined;
  if (colorStr.startsWith('#')) {
    const raw = colorStr.substring(1).replace(/[^0-9a-fA-F]/g, '');
    if (raw.length === 3) {
      return raw
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (raw.length >= 6) return raw.substring(0, 6);
  }
  if (colorStr.startsWith('rgb')) {
    const parts = colorStr.match(/\d+/g);
    if (parts && parts.length >= 3) {
      const r = parseInt(parts[0], 10).toString(16).padStart(2, '0');
      const g = parseInt(parts[1], 10).toString(16).padStart(2, '0');
      const b = parseInt(parts[2], 10).toString(16).padStart(2, '0');
      return `${r}${g}${b}`;
    }
  }
  const named: Record<string, string> = {
    black: '000000',
    white: 'ffffff',
    red: 'dc2626',
    blue: '2563eb',
    green: '16a34a',
    gray: '64748b',
    navy: '1e3a8a',
  };
  return named[colorStr];
}

/**
 * Extracts formatted TextRuns recursively from inline nodes
 */
function extractTextRuns(node: Node, inheritedStyles: ParsedStyles): TextRun[] {
  const runs: TextRun[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return [];

    const runOptions: {
      text: string;
      bold?: boolean;
      italics?: boolean;
      underline?: { type: (typeof UnderlineType)[keyof typeof UnderlineType] };
      strike?: boolean;
      color?: string;
      font?: string;
      size?: number; // half-points in docx (12pt = 24)
    } = {
      text,
      bold: inheritedStyles.bold,
      italics: inheritedStyles.italic,
      strike: inheritedStyles.strike,
      color: inheritedStyles.color,
      font: inheritedStyles.fontFamily || 'Arial',
    };

    if (inheritedStyles.underline) {
      runOptions.underline = { type: UnderlineType.SINGLE };
    }

    if (inheritedStyles.fontSizePt) {
      runOptions.size = inheritedStyles.fontSizePt * 2;
    } else {
      runOptions.size = 22; // 11pt default
    }

    runs.push(new TextRun(runOptions));
    return runs;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Check line breaks
    if (tagName === 'br') {
      runs.push(new TextRun({ text: '', break: 1 }));
      return runs;
    }

    const currentStyles: ParsedStyles = {
      ...inheritedStyles,
      ...parseStyleString(el.getAttribute('style')),
    };

    if (tagName === 'strong' || tagName === 'b') currentStyles.bold = true;
    if (tagName === 'em' || tagName === 'i') currentStyles.italic = true;
    if (tagName === 'u') currentStyles.underline = true;
    if (tagName === 's' || tagName === 'strike' || tagName === 'del') currentStyles.strike = true;

    for (let i = 0; i < el.childNodes.length; i++) {
      runs.push(...extractTextRuns(el.childNodes[i], currentStyles));
    }
  }

  return runs;
}

/**
 * Converts HTML content into structured docx Paragraphs and Elements
 */
export async function exportHtmlToDocxBlob(htmlContent: string, documentTitle: string): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const body = doc.body;

  const docChildren: Paragraph[] = [];

  // Helper to build paragraph
  const processBlockElement = (el: HTMLElement) => {
    const tagName = el.tagName.toLowerCase();
    const styleAttr = el.getAttribute('style');
    const styles = parseStyleString(styleAttr);

    // Check for Horizontal Rule
    if (tagName === 'hr') {
      docChildren.push(
        new Paragraph({
          border: {
            bottom: {
              color: 'CBD5E1',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          spacing: { before: 160, after: 160 },
        })
      );
      return;
    }

    // Check for Page Break marker
    if (el.classList.contains('page-break') || (styleAttr && styleAttr.includes('page-break-before: always'))) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: '', break: 1 })],
          pageBreakBefore: true,
        })
      );
      return;
    }

    // Heading mappings
    let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
    let defaultSizePt = 11;
    let isBold = styles.bold;

    if (tagName === 'h1') {
      headingLevel = HeadingLevel.HEADING_1;
      defaultSizePt = 20;
      isBold = true;
    } else if (tagName === 'h2') {
      headingLevel = HeadingLevel.HEADING_2;
      defaultSizePt = 16;
      isBold = true;
    } else if (tagName === 'h3') {
      headingLevel = HeadingLevel.HEADING_3;
      defaultSizePt = 13;
      isBold = true;
    } else if (tagName === 'h4') {
      headingLevel = HeadingLevel.HEADING_4;
      defaultSizePt = 12;
      isBold = true;
    }

    const runs = extractTextRuns(el, {
      ...styles,
      bold: isBold,
      fontSizePt: styles.fontSizePt || defaultSizePt,
    });

    const isList = tagName === 'li';
    const isOrdered = el.parentElement?.tagName.toLowerCase() === 'ol';

    const pOptions: any = {
      children: runs.length > 0 ? runs : [new TextRun({ text: el.textContent || '' })],
      alignment: styles.alignment || (tagName === 'h1' && !styles.alignment ? AlignmentType.CENTER : AlignmentType.LEFT),
      spacing: {
        line: styles.lineSpacing ? Math.round(styles.lineSpacing * 240) : 276, // ~1.15 line height
        before: headingLevel ? 200 : 80,
        after: headingLevel ? 120 : 80,
      },
    };

    if (headingLevel) {
      pOptions.heading = headingLevel;
    }

    if (styles.highlight) {
      pOptions.shading = {
        fill: styles.highlight,
        type: ShadingType.CLEAR,
      };
    }

    if (isList) {
      if (isOrdered) {
        pOptions.numbering = { reference: 'ordered-list', level: 0 };
      } else {
        pOptions.bullet = { level: 0 };
      }
    }

    docChildren.push(new Paragraph(pOptions));
  };

  // Traverse top level children of body
  for (let i = 0; i < body.childNodes.length; i++) {
    const child = body.childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'ul' || tag === 'ol') {
        for (let j = 0; j < el.children.length; j++) {
          processBlockElement(el.children[j] as HTMLElement);
        }
      } else {
        processBlockElement(el);
      }
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun(child.textContent.trim())],
          spacing: { after: 100 },
        })
      );
    }
  }

  // If document was completely empty, add at least one empty paragraph
  if (docChildren.length === 0) {
    docChildren.push(new Paragraph({ children: [new TextRun('')] }));
  }

  const docxDoc = new Document({
    title: documentTitle,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 25.4mm
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(docxDoc);
}

/**
 * Triggers direct browser download of .docx file
 */
export async function downloadDocumentAsDocx(title: string, htmlContent: string): Promise<void> {
  const blob = await exportHtmlToDocxBlob(htmlContent, title);
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'documento'}_${new Date().toISOString().split('T')[0]}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
