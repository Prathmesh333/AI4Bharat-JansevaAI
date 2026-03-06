// CSV Data Loader for Indian Government Schemes Dataset
// Parses dataset/updated_data.csv into typed scheme objects

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CSVLoader');

export interface CsvScheme {
  scheme_name: string;
  slug: string;
  details: string;
  benefits: string;
  eligibility: string;
  application: string;
  documents: string;
  level: 'Central' | 'State';
  schemeCategory: string;
  tags: string[];
  // Derived fields
  categories: string[];
  officialUrl: string;
}

/**
 * Parse a CSV line handling quoted fields with commas and newlines inside
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote ""
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parse the full CSV content handling multi-line quoted fields
 */
function parseCSVContent(content: string): string[][] {
  const rows: string[][] = [];
  let currentLine = '';
  let inQuotes = false;

  const lines = content.split('\n');

  for (const line of lines) {
    // Count unescaped quotes to track state
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      }
    }

    if (currentLine) {
      currentLine += '\n' + line;
    } else {
      currentLine = line;
    }

    if (!inQuotes) {
      // Line is complete
      const trimmed = currentLine.trim();
      if (trimmed) {
        rows.push(parseCSVLine(trimmed));
      }
      currentLine = '';
      inQuotes = false;
    }
  }

  // Handle any remaining content
  if (currentLine.trim()) {
    rows.push(parseCSVLine(currentLine.trim()));
  }

  return rows;
}

/**
 * Load and parse schemes from the CSV dataset file
 */
export async function loadSchemesFromCSV(filePath: string): Promise<CsvScheme[]> {
  try {
    const absolutePath = path.resolve(filePath);
    logger.info('Loading schemes from CSV', { path: absolutePath });

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`CSV file not found: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const rows = parseCSVContent(content);

    if (rows.length < 2) {
      throw new Error('CSV file has no data rows');
    }

    // First row is headers
    const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
    const headerMap: Record<string, number> = {};
    headers.forEach((h, i) => { headerMap[h] = i; });

    // Validate required columns
    const requiredCols = ['scheme_name', 'slug', 'details', 'benefits', 'eligibility', 'application', 'documents', 'level'];
    for (const col of requiredCols) {
      if (!(col in headerMap)) {
        throw new Error(`Required column '${col}' not found in CSV. Found: ${headers.join(', ')}`);
      }
    }

    const schemes: CsvScheme[] = [];
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const schemeName = row[headerMap['scheme_name']] || '';

      // Skip rows with no scheme name
      if (!schemeName.trim()) {
        skipped++;
        continue;
      }

      const rawTags = row[headerMap['tags']] || '';
      const rawCategory = row[headerMap['schemecategory']] || '';
      const slug = row[headerMap['slug']] || '';

      const scheme: CsvScheme = {
        scheme_name: schemeName.trim(),
        slug: slug.trim(),
        details: (row[headerMap['details']] || '').trim(),
        benefits: (row[headerMap['benefits']] || '').trim(),
        eligibility: (row[headerMap['eligibility']] || '').trim(),
        application: (row[headerMap['application']] || '').trim(),
        documents: (row[headerMap['documents']] || '').trim(),
        level: (row[headerMap['level']] || '').trim() === 'Central' ? 'Central' : 'State',
        schemeCategory: rawCategory.trim(),
        tags: rawTags.split(',').map(t => t.trim()).filter(Boolean),
        categories: rawCategory.split(',').map(c => c.trim()).filter(Boolean),
        officialUrl: slug ? `https://www.myscheme.gov.in/schemes/${slug.trim()}` : '',
      };

      schemes.push(scheme);
    }

    logger.info('CSV loading complete', {
      totalRows: rows.length - 1,
      loadedSchemes: schemes.length,
      skippedRows: skipped,
    });

    return schemes;

  } catch (error) {
    logger.error('Failed to load CSV', error as Error);
    throw error;
  }
}
