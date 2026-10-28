import DOMPurify from 'dompurify';
import { DocumentField, DocumentTemplate } from '../types';

/**
 * Fills template placeholders with form data.
 * Supports:
 * - Simple substitutions: {{field_id}}
 * - Conditional blocks: {{#if field_id}}content with {{field_id}}{{/if}}
 */
export function compileDocumentTemplate(
  templateBody: string,
  formData: Record<string, string>,
  fields: DocumentField[]
): string {
  let result = templateBody;
  const isHtml = /<[a-z][\s\S]*>/i.test(result);

  // Process conditional blocks: {{#if key}}...{{/if}}
  const ifRegex = /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(ifRegex, (match, key, blockContent) => {
    const val = (formData[key] || '').trim();
    if (val) {
      // If value is present, keep the inner content (which will have its variables replaced in next step)
      return blockContent;
    }
    return '';
  });

  // Process variable substitutions: {{key}}
  const tagOccurrences: Record<string, number> = {};
  const varRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  result = result.replace(varRegex, (match, key) => {
    tagOccurrences[key] = (tagOccurrences[key] || 0) + 1;
    const occ = tagOccurrences[key];

    // 1. Direct match: formData[key] (e.g. 'funcao_2' or 'funcao')
    let val: string | undefined = formData[key];

    // 2. If tag appears multiple times (e.g. {{funcao}} repeated) but formData has indexed keys:
    if (val === undefined || val === null || val === '') {
      if (occ > 1 && formData[`${key}_${occ}`] !== undefined) {
        val = formData[`${key}_${occ}`];
      }
    } else if (occ > 1 && formData[`${key}_${occ}`] !== undefined) {
      val = formData[`${key}_${occ}`];
    }

    if (val !== undefined && val !== null && val.trim() !== '') {
      const trimmed = val.trim();
      if (isHtml && trimmed.includes('\n')) {
        // In HTML mode, format newlines gracefully as line breaks
        return trimmed.replace(/\n/g, '<br/>');
      }
      return trimmed;
    }
    return `[${key.toUpperCase().replace(/_/g, ' ')}]`;
  });

  if (!isHtml) {
    // Clean up duplicate blank lines in plain text
    result = result.replace(/\n{3,}/g, '\n\n');
  }

  return result.trim();
}

/**
 * Ensures each occurrence of a tag in a template body has its own independent
 * field definition in the template fields list and a unique placeholder identity.
 * 
 * Example: If {{funcao}} is added 3 times:
 * First occurrence: {{funcao}} with field id: 'funcao'
 * Second occurrence: {{funcao_2}} with field id: 'funcao_2'
 * Third occurrence: {{funcao_3}} with field id: 'funcao_3'
 */
export function normalizeTemplateFieldInstances(
  templateBody: string,
  fields: DocumentField[]
): { templateBody: string; fields: DocumentField[] } {
  if (!templateBody) {
    return { templateBody: '', fields: [...(fields || [])] };
  }

  const currentFields: DocumentField[] = [...(fields || [])];

  let updatedBody = templateBody;
  const replacedCount: Record<string, number> = {};

  // If any tag appears multiple times in templateBody (e.g. {{funcao}} repeated 3 times)
  // and does NOT already have distinct tags (e.g. {{funcao_2}}), assign unique instance IDs
  updatedBody = updatedBody.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (fullMatch, tag) => {
    if (tag.startsWith('#') || tag.startsWith('/')) return fullMatch;
    replacedCount[tag] = (replacedCount[tag] || 0) + 1;
    const count = replacedCount[tag];

    // If tag is already an indexed instance (e.g. 'funcao_2'), keep it
    if (/_\d+$/.test(tag)) {
      if (!currentFields.some((f) => f.id === tag)) {
        const base = tag.replace(/_\d+$/, '');
        const templateProto = currentFields.find((f) => f.id === base) || currentFields[0];
        currentFields.push({
          id: tag,
          label: templateProto ? templateProto.label : tag.replace(/_/g, ' '),
          type: templateProto ? templateProto.type : 'text',
          required: templateProto ? templateProto.required : false,
          placeholder: templateProto ? templateProto.placeholder : undefined,
          defaultValue: templateProto ? templateProto.defaultValue : undefined,
          options: templateProto ? templateProto.options : undefined,
          helpText: templateProto ? templateProto.helpText : undefined,
        });
      }
      return fullMatch;
    }

    // If this is occurrence > 1 of a non-indexed tag, convert to tag_N
    if (count > 1) {
      const instanceId = `${tag}_${count}`;
      if (!currentFields.some((f) => f.id === instanceId)) {
        const baseField = currentFields.find((f) => f.id === tag);
        currentFields.push({
          id: instanceId,
          label: baseField ? baseField.label : tag.replace(/_/g, ' '),
          type: baseField ? baseField.type : 'text',
          required: baseField ? baseField.required : false,
          placeholder: baseField ? baseField.placeholder : undefined,
          defaultValue: baseField ? baseField.defaultValue : undefined,
          options: baseField ? baseField.options : undefined,
          helpText: baseField ? baseField.helpText : undefined,
        });
      }
      return `{{${instanceId}}}`;
    }

    // Occurrence 1: ensure base field exists
    if (!currentFields.some((f) => f.id === tag)) {
      currentFields.push({
        id: tag,
        label: tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type: 'text',
        required: false,
      });
    }

    return fullMatch;
  });

  return {
    templateBody: updatedBody,
    fields: currentFields,
  };
}

/**
 * Normalizes legacy text / markdown template content into rich HTML for visual WYSIWYG editor
 */
export function convertTemplateToHtml(templateBody: string): string {
  if (!templateBody || !templateBody.trim()) {
    return '<p><br></p>';
  }

  // If already rich HTML, return sanitized
  if (/<[a-z][\s\S]*>/i.test(templateBody)) {
    return templateBody;
  }

  // Convert markdown-like syntax to clean HTML
  const lines = templateBody.split('\n');
  const htmlParts: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      htmlParts.push('<p><br></p>');
      continue;
    }

    if (trimmed.startsWith('# ')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      const text = trimmed.replace(/^# /, '');
      htmlParts.push(`<h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 12px;">${formatInlineMarkdown(text)}</h1>`);
    } else if (trimmed.startsWith('## ')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      const text = trimmed.replace(/^## /, '');
      htmlParts.push(`<h2 style="font-size: 16pt; font-weight: bold; margin-top: 14px; margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 4px;">${formatInlineMarkdown(text)}</h2>`);
    } else if (trimmed.startsWith('### ')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      const text = trimmed.replace(/^### /, '');
      htmlParts.push(`<h3 style="font-size: 13pt; font-weight: bold; margin-top: 12px; margin-bottom: 6px; text-transform: uppercase; color: #1e293b;">${formatInlineMarkdown(text)}</h3>`);
    } else if (trimmed === '---' || trimmed === '***') {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      htmlParts.push('<hr style="border: none; border-top: 1px solid #cbd5e1; margin: 14px 0;" />');
    } else if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        htmlParts.push('<ul style="padding-left: 20px; margin: 6px 0;">');
        inList = true;
      }
      const text = trimmed.replace(/^[•\-\*]\s*/, '');
      htmlParts.push(`<li style="margin-bottom: 4px;">${formatInlineMarkdown(text)}</li>`);
    } else {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      htmlParts.push(`<p style="margin-bottom: 6px; line-height: 1.5;">${formatInlineMarkdown(line)}</p>`);
    }
  }

  if (inList) {
    htmlParts.push('</ul>');
  }

  return htmlParts.join('\n');
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/~~(.*?)~~/g, '<s>$1</s>');
}

/**
 * Quick plain-text to styled HTML converter for direct document printing or preview
 */
export function formatDocumentToHtml(content: string, title?: string): string {
  // Simple markdown to HTML conversion for print and preview
  let html = (content || '')
    .replace(/^# (.*$)/gim, '<h1 class="doc-h1">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="doc-h2">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="doc-h3">$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^---$/gim, '<hr class="doc-hr" />')
    .replace(/^• (.*$)/gim, '<li class="doc-li">$1</li>')
    .replace(/\n\n/g, '</p><p class="doc-p">')
    .replace(/\n/g, '<br />');

  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'u', 's', 'hr', 'li', 'ul', 'ol', 'span', 'div', 'table', 'tr', 'td', 'th', 'tbody', 'thead'],
    ALLOWED_ATTR: ['class', 'style'],
  });

  return `<div class="document-page">${sanitized}</div>`;
}

/**
 * Triggers standard browser print with print-only styles
 */
export function printDocumentContent(title: string, formattedContent: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm 15mm 20mm 15mm;
        }
        body {
          font-family: 'Times New Roman', Times, 'Liberation Serif', serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #111;
          background: #fff;
          margin: 0;
          padding: 20px;
        }
        h1.doc-h1 {
          font-size: 18pt;
          text-align: center;
          font-weight: bold;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        h2.doc-h2 {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 18px;
          margin-bottom: 8px;
          border-bottom: 1px solid #333;
          padding-bottom: 4px;
        }
        h3.doc-h3 {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 14px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        p.doc-p, p {
          margin-top: 0;
          margin-bottom: 10px;
          text-align: justify;
        }
        strong {
          font-weight: bold;
        }
        hr.doc-hr {
          border: none;
          border-top: 1px solid #ccc;
          margin: 14px 0;
        }
        li.doc-li {
          margin-left: 20px;
          margin-bottom: 4px;
        }
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      ${formattedContent}
      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Downloads document as .txt or .doc file
 */
export function downloadDocumentFile(title: string, content: string, extension: 'txt' | 'doc' = 'doc'): void {
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.${extension}`;
  
  let mimeType = 'text/plain;charset=utf-8';
  let fileContent = content;

  if (extension === 'doc') {
    mimeType = 'application/msword;charset=utf-8';
    fileContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title></head>
      <body style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;">
        ${content.replace(/\n/g, '<br/>')}
      </body>
      </html>
    `;
  }

  const blob = new Blob([fileContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
