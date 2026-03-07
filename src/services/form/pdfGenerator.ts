// Printable HTML Form Generator
// Generates clean, printable HTML forms with auto-filled user data + document checklist

import { FormTemplate, Language } from '../../types';
import { CsvScheme } from '../schemes/csvLoader';
import { extractDocumentChecklist } from './dynamicTemplate';
import { createLogger } from '../../utils/logger';

const logger = createLogger('PDFGenerator');

export interface FormData {
  [fieldId: string]: string | number | boolean;
}

/**
 * Generate a printable HTML form for a scheme, pre-filled with user data
 */
export function generatePrintableForm(
  scheme: CsvScheme,
  template: FormTemplate,
  userData: FormData,
  language: Language = Language.ENGLISH
): string {
  logger.info('Generating printable form', {
    scheme: scheme.scheme_name,
    fieldsCount: template.fields.length,
    filledFields: Object.keys(userData).length,
  });

  const documentChecklist = extractDocumentChecklist(scheme);
  const referenceNumber = generateReferenceNumber(scheme.slug || scheme.scheme_name);
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Form - ${escapeHtml(scheme.scheme_name)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', 'Noto Sans Devanagari', sans-serif;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.6;
      font-size: 13px;
    }

    .form-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 32px;
    }

    /* Header */
    .form-header {
      text-align: center;
      border-bottom: 3px solid #1a1a2e;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .form-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
    }

    .form-subtitle {
      font-size: 12px;
      color: #555;
    }

    .form-caption {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #455a64;
      margin-bottom: 6px;
    }

    .scheme-level {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 6px;
    }

    .level-central { background: #e8f5e9; color: #2e7d32; }
    .level-state { background: #e3f2fd; color: #1565c0; }

    /* Meta info bar */
    .meta-bar {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #666;
      margin-bottom: 16px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    /* Sections */
    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1a1a2e;
      border-bottom: 1.5px solid #ddd;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }

    /* Form fields */
    .fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .field {
      padding: 8px 10px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: #fafafa;
    }

    .field-full { grid-column: 1 / -1; }

    .field-label {
      font-size: 10px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }

    .field-value {
      font-size: 13px;
      font-weight: 500;
      color: #1a1a2e;
      min-height: 18px;
      border-bottom: 1px dotted #ccc;
      padding-bottom: 2px;
    }

    .field-value.filled {
      color: #1565c0;
      font-weight: 600;
      border-bottom-color: #1565c0;
    }

    .field-value.empty {
      color: transparent;
      font-style: normal;
    }

    /* Document checklist */
    .doc-checklist {
      list-style: none;
      padding: 0;
    }

    .doc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 12px;
    }

    .doc-checkbox {
      width: 16px;
      height: 16px;
      border: 1.5px solid #999;
      border-radius: 3px;
      flex-shrink: 0;
    }

    /* Application steps */
    .steps-list {
      padding-left: 20px;
    }

    .steps-list li {
      margin-bottom: 6px;
      font-size: 12px;
      color: #444;
    }

    /* Scheme info box */
    .info-box {
      background: #f8fafc;
      border: 1px solid #d7dee5;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }

    .info-box p {
      font-size: 12px;
      color: #333;
      margin-bottom: 6px;
    }

    .info-box strong {
      color: #1a1a2e;
    }

    /* Footer */
    .form-footer {
      border-top: 2px solid #1a1a2e;
      padding-top: 16px;
      margin-top: 24px;
    }

    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }

    .signature-box {
      text-align: center;
      width: 200px;
    }

    .signature-line {
      border-top: 1px solid #333;
      margin-top: 50px;
      padding-top: 4px;
      font-size: 11px;
      color: #555;
    }

    .disclaimer {
      font-size: 10px;
      color: #888;
      margin-top: 20px;
      padding: 10px;
      background: #fafafa;
      border-radius: 4px;
      line-height: 1.5;
    }

    .official-link {
      text-align: center;
      margin-top: 12px;
      font-size: 11px;
    }

    .official-link a {
      color: #1565c0;
      text-decoration: none;
    }

    /* Declaration */
    .declaration {
      font-size: 11px;
      color: #333;
      padding: 10px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      margin-bottom: 16px;
      line-height: 1.6;
    }

    /* Guidance boxes */
    .guidance-box {
      background: #fcfcfd;
      border: 1px solid #d7dee5;
      border-left: 4px solid #607d8b;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }

    .guidance-box h4 {
      font-size: 13px;
      color: #1a1a2e;
      margin-bottom: 8px;
    }

    .guidance-box ul {
      padding-left: 18px;
      margin: 0;
    }

    .guidance-box li {
      font-size: 11px;
      color: #555;
      margin-bottom: 4px;
      line-height: 1.5;
    }

    .submission-box {
      background: #fcfcfd;
      border: 1px solid #d7dee5;
      border-left: 4px solid #607d8b;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }

    .submission-box h4 {
      font-size: 13px;
      color: #1a1a2e;
      margin-bottom: 8px;
    }

    .submission-box p, .submission-box li {
      font-size: 11px;
      color: #333;
      line-height: 1.6;
    }

    .submission-box ul {
      padding-left: 18px;
      margin: 6px 0;
    }

    .eligibility-box {
      background: #fcfcfd;
      border: 1px solid #d7dee5;
      border-left: 4px solid #607d8b;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }

    .eligibility-box h4 {
      font-size: 13px;
      color: #1a1a2e;
      margin-bottom: 8px;
    }

    .eligibility-box p {
      font-size: 11px;
      color: #333;
      line-height: 1.6;
    }

    .helpline-box {
      background: #e3f2fd;
      border: 1px solid #90caf9;
      border-radius: 6px;
      padding: 12px 16px;
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .helpline-item {
      font-size: 11px;
      color: #333;
    }

    .helpline-item strong {
      color: #1a1a2e;
      display: block;
      margin-bottom: 2px;
    }

    /* Print styles */
    @media print {
      body { font-size: 12px; }
      .form-container { padding: 16px; }
      .field { break-inside: avoid; }
      .no-print { display: none !important; }
      .guidance-box, .submission-box, .eligibility-box { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="form-container">

    <!-- Header -->
    <div class="form-header">
      <div class="form-caption">Government Scheme Application Summary</div>
      <div class="form-title">${escapeHtml(scheme.scheme_name)}</div>
      <div class="form-subtitle">Application summary prepared by JanSeva AI</div>
      <span class="scheme-level ${scheme.level === 'Central' ? 'level-central' : 'level-state'}">
        ${scheme.level === 'Central' ? 'Central Government Scheme' : 'State Government Scheme'}
      </span>
    </div>

    <!-- Meta bar -->
    <div class="meta-bar">
      <span>Reference No.: ${referenceNumber}</span>
      <span>Date: ${currentDate}</span>
      <span>Category: ${escapeHtml(scheme.schemeCategory || 'General')}</span>
    </div>

    <!-- Scheme Info -->
    <div class="info-box">
      <p><strong>Scheme Details:</strong> ${escapeHtml(scheme.details.substring(0, 400))}${scheme.details.length > 400 ? '...' : ''}</p>
      ${scheme.benefits ? `<p><strong>Benefits:</strong> ${escapeHtml(scheme.benefits.substring(0, 300))}${scheme.benefits.length > 300 ? '...' : ''}</p>` : ''}
    </div>

    <!-- Important Instructions -->
    <div class="guidance-box">
      <h4>Important Instructions - Please Read Before Filling</h4>
      <ul>
        <li>Fill all fields in <strong>BLOCK LETTERS</strong> using black or blue ink pen (if filling by hand).</li>
        <li>All information must match your official identity documents (Aadhaar, PAN, etc.).</li>
        <li>Attach <strong>self-attested photocopies</strong> of all required documents listed in the checklist below.</li>
        <li>Do not leave any mandatory field blank. Write "N/A" if a field is not applicable to you.</li>
        <li>Ensure your <strong>bank account is linked to Aadhaar</strong> for Direct Benefit Transfer (DBT).</li>
        <li>Carry <strong>original documents</strong> for verification when submitting the application.</li>
        <li>Keep a <strong>photocopy of this filled form</strong> and the acknowledgement receipt for your records.</li>
        <li>Fields marked with pre-filled data (in blue) have been auto-filled from your conversation. Please verify them.</li>
      </ul>
    </div>

    <!-- Where to Submit -->
    <div class="submission-box">
      <h4>Where and How to Submit This Form</h4>
      ${scheme.application ? `<p>${escapeHtml(scheme.application.substring(0, 600))}${scheme.application.length > 600 ? '...' : ''}</p>` : ''}
      <ul>
        <li><strong>Online:</strong> ${scheme.officialUrl ? `Visit the official portal at <a href="${escapeHtml(scheme.officialUrl)}">${escapeHtml(scheme.officialUrl)}</a>` : 'Visit the respective government department portal'} and submit the application digitally.</li>
        <li><strong>Common Service Center (CSC):</strong> Visit your nearest CSC with this filled form and original documents. CSC operators can help you submit the application. Timings: Usually Mon-Sat, 9:00 AM to 6:00 PM.</li>
        <li><strong>Government Office:</strong> Submit at the ${scheme.level === 'Central' ? 'nearest District Office or Block Development Office' : 'respective State Government Department office or Taluka office'}.</li>
      </ul>
      <p style="margin-top: 8px; font-weight: 600; color: #1b5e20;">Office Timings: Monday to Friday, 10:00 AM - 5:00 PM (except public holidays). Some CSCs are open on Saturdays.</p>
    </div>

    <!-- Eligibility Criteria -->
    ${scheme.eligibility ? `
    <div class="eligibility-box">
      <h4>Eligibility Criteria</h4>
      <p>${escapeHtml(scheme.eligibility.substring(0, 500))}${scheme.eligibility.length > 500 ? '...' : ''}</p>
    </div>` : ''}

    <!-- Applicant Details -->
    <div class="section">
      <div class="section-title">Applicant Details</div>
      <div class="fields-grid">
        ${template.fields.map(field => {
    const value = userData[field.fieldId];
    const hasValue = value !== undefined && value !== '' && value !== null;
    const isFullWidth = ['address', 'full_name', 'institution_name'].includes(field.fieldId);
    return `
        <div class="field ${isFullWidth ? 'field-full' : ''}">
          <div class="field-label">${escapeHtml(field.fieldName)}</div>
          <div class="field-value ${hasValue ? 'filled' : 'empty'}">
            ${hasValue ? escapeHtml(String(value)) : '&nbsp;'}
          </div>
        </div>`;
  }).join('')}
      </div>
    </div>

    <!-- Document Checklist -->
    <div class="section">
      <div class="section-title">Required Documents Checklist</div>
      <ul class="doc-checklist">
        ${documentChecklist.map(doc => `
        <li class="doc-item">
          <div class="doc-checkbox"></div>
          <span>${escapeHtml(doc)}</span>
        </li>`).join('')}
      </ul>
    </div>

    ${scheme.application ? `
    <!-- Application Steps -->
    <div class="section">
      <div class="section-title">How to Apply</div>
      <div style="font-size: 12px; color: #444; line-height: 1.7;">
        ${escapeHtml(scheme.application.substring(0, 500))}${scheme.application.length > 500 ? '...' : ''}
      </div>
    </div>` : ''}

    <!-- Declaration -->
    <div class="section">
      <div class="section-title">Declaration</div>
      <div class="declaration">
        I hereby declare that the information provided above is true and correct to the best of my knowledge
        and belief. I understand that any false statement or misrepresentation of facts may result in
        rejection of my application or cancellation of benefits already granted. I consent to verification
        of the information provided herein.
      </div>
    </div>

    <!-- Footer with Signatures -->
    <div class="form-footer">
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">Date & Place</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Applicant's Signature / Thumb Impression</div>
        </div>
      </div>

      ${scheme.officialUrl ? `
      <div class="official-link">
        Official Portal: <a href="${escapeHtml(scheme.officialUrl)}">${escapeHtml(scheme.officialUrl)}</a>
      </div>` : ''}

      <div class="disclaimer">
        <strong>Disclaimer:</strong> This is a pre-filled application summary generated by JanSeva AI to assist
        citizens in applying for government schemes. This is NOT an official government form. Please verify
        all information with the respective government department or your nearest Common Service Centre (CSC)
        before submission. The official application may require additional documents or information.
      </div>

      <!-- Helpline & Contact -->
      <div class="helpline-box">
        <div class="helpline-item">
          <strong>CSC Helpline</strong>
          Toll-Free: 1800-121-3468<br>
          Email: helpdesk@csc.gov.in
        </div>
        <div class="helpline-item">
          <strong>Grievance Portal</strong>
          CPGRAMS: pgportal.gov.in<br>
          MyScheme: myscheme.gov.in
        </div>
        ${scheme.officialUrl ? `
        <div class="helpline-item">
          <strong>Official Scheme Portal</strong>
          <a href="${escapeHtml(scheme.officialUrl)}" style="color: #1565c0;">${escapeHtml(scheme.officialUrl)}</a>
        </div>` : ''}
        <div class="helpline-item">
          <strong>Nearest CSC</strong>
          Find your nearest CSC with JanSeva AI:<br>
          <a href="/?csc=true" style="color: #1565c0;">Open CSC Finder</a>
        </div>
      </div>
    </div>

  </div>

  <!-- Print Button (hidden when printing) -->
  <div style="text-align: center; padding: 20px;" class="no-print">
    <button onclick="window.print()" style="
      padding: 12px 32px;
      font-size: 16px;
      font-weight: 600;
      background: #1565c0;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    ">Print Form</button>
  </div>

</body>
</html>`;

  return html;
}

/**
 * Generate a reference number for the form
 */
function generateReferenceNumber(schemeId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = schemeId.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
  return `JS-${prefix}-${timestamp}-${random}`;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
