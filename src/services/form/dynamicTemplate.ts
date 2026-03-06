// AI-Powered Dynamic Form Template Generator
// Uses Gemini to extract form fields from scheme's application & documents text

import { FormTemplate, FormField, Language } from '../../types';
import { CsvScheme } from '../schemes/csvLoader';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DynamicTemplate');

// In-memory template cache by slug
const templateCache = new Map<string, FormTemplate>();

/**
 * Common form fields that appear in most government scheme applications
 */
const COMMON_FIELDS: FormField[] = [
    {
        fieldId: 'full_name',
        fieldName: 'Full Name (as per Aadhaar)',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your full name as per Aadhaar card?',
            [Language.HINDI]: 'आधार कार्ड के अनुसार आपका पूरा नाम क्या है?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'father_name',
        fieldName: "Father's/Husband's Name",
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: "What is your father's or husband's name?",
            [Language.HINDI]: 'आपके पिता/पति का नाम क्या है?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'date_of_birth',
        fieldName: 'Date of Birth',
        fieldType: 'date',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your date of birth?',
            [Language.HINDI]: 'आपकी जन्म तिथि क्या है?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'gender',
        fieldName: 'Gender',
        fieldType: 'select',
        required: true,
        options: ['Male', 'Female', 'Other'],
        question: {
            [Language.ENGLISH]: 'What is your gender?',
            [Language.HINDI]: 'आपका लिंग क्या है?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'aadhaar_number',
        fieldName: 'Aadhaar Number',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your Aadhaar number?',
            [Language.HINDI]: 'आपका आधार नंबर क्या है?',
        } as Record<Language, string>,
        validation: { pattern: '^[0-9]{12}$' },
    },
    {
        fieldId: 'mobile_number',
        fieldName: 'Mobile Number',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your mobile number?',
            [Language.HINDI]: 'आपका मोबाइल नंबर क्या है?',
        } as Record<Language, string>,
        validation: { pattern: '^[0-9]{10}$' },
    },
    {
        fieldId: 'address',
        fieldName: 'Full Address',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your full address?',
            [Language.HINDI]: 'आपका पूरा पता क्या है?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'state',
        fieldName: 'State',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'Which state do you live in?',
            [Language.HINDI]: 'आप किस राज्य में रहते हैं?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'district',
        fieldName: 'District',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'Which district do you live in?',
            [Language.HINDI]: 'आप किस जिले में रहते हैं?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'pincode',
        fieldName: 'PIN Code',
        fieldType: 'text',
        required: false,
        question: {
            [Language.ENGLISH]: 'What is your PIN code?',
            [Language.HINDI]: 'आपका पिन कोड क्या है?',
        } as Record<Language, string>,
        validation: { pattern: '^[0-9]{6}$' },
    },
    {
        fieldId: 'annual_income',
        fieldName: 'Annual Family Income (₹)',
        fieldType: 'number',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your annual family income?',
            [Language.HINDI]: 'आपकी वार्षिक पारिवारिक आय कितनी है?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'caste_category',
        fieldName: 'Caste Category',
        fieldType: 'select',
        required: true,
        options: ['General', 'OBC', 'SC', 'ST', 'EWS'],
        question: {
            [Language.ENGLISH]: 'What is your caste category?',
            [Language.HINDI]: 'आपकी जाति श्रेणी क्या है?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'bank_account',
        fieldName: 'Bank Account Number',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your bank account number?',
            [Language.HINDI]: 'आपका बैंक खाता नंबर क्या है?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'ifsc_code',
        fieldName: 'IFSC Code',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your bank IFSC code?',
            [Language.HINDI]: 'आपके बैंक का IFSC कोड क्या है?',
        } as Record<Language, string>,
    },
    {
        fieldId: 'bank_name',
        fieldName: 'Bank Name & Branch',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your bank name and branch?',
            [Language.HINDI]: 'आपके बैंक का नाम और शाखा क्या है?',
        } as Record<Language, string>,
    },
];

/**
 * Additional domain-specific fields detected from scheme text
 */
const DOMAIN_FIELDS: Record<string, FormField> = {
    occupation: {
        fieldId: 'occupation',
        fieldName: 'Occupation',
        fieldType: 'text',
        required: true,
        question: {
            [Language.ENGLISH]: 'What is your occupation?',
            [Language.HINDI]: 'आपका व्यवसाय क्या है?',
        } as Record<Language, string>,
    },
    land_area: {
        fieldId: 'land_area',
        fieldName: 'Land Area (in acres/hectares)',
        fieldType: 'text',
        required: false,
        question: {
            [Language.ENGLISH]: 'How much land do you own (in acres)?',
            [Language.HINDI]: 'आपके पास कितनी भूमि है (एकड़ में)?',
        } as Record<Language, string>,
    },
    education: {
        fieldId: 'education_level',
        fieldName: 'Educational Qualification',
        fieldType: 'select',
        required: false,
        options: ['Below 10th', '10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'Other'],
        question: {
            [Language.ENGLISH]: 'What is your highest educational qualification?',
            [Language.HINDI]: 'आपकी उच्चतम शैक्षणिक योग्यता क्या है?',
        } as Record<Language, string>,
    },
    disability: {
        fieldId: 'disability_type',
        fieldName: 'Type of Disability',
        fieldType: 'text',
        required: false,
        question: {
            [Language.ENGLISH]: 'What type of disability do you have (if any)?',
            [Language.HINDI]: 'आपको किस प्रकार की विकलांगता है (यदि कोई हो)?',
        } as Record<Language, string>,
    },
    disability_percentage: {
        fieldId: 'disability_percentage',
        fieldName: 'Disability Percentage',
        fieldType: 'number',
        required: false,
        question: {
            [Language.ENGLISH]: 'What is your disability percentage?',
            [Language.HINDI]: 'आपकी विकलांगता का प्रतिशत कितना है?',
        } as Record<Language, string>,
    },
    ration_card: {
        fieldId: 'ration_card_type',
        fieldName: 'Ration Card Type',
        fieldType: 'select',
        required: false,
        options: ['APL', 'BPL', 'Antyodaya', 'None'],
        question: {
            [Language.ENGLISH]: 'What type of ration card do you have?',
            [Language.HINDI]: 'आपके पास किस प्रकार का राशन कार्ड है?',
        } as Record<Language, string>,
    },
    institution_name: {
        fieldId: 'institution_name',
        fieldName: 'Name of Institution/School/College',
        fieldType: 'text',
        required: false,
        question: {
            [Language.ENGLISH]: 'What is the name of your school/college/institution?',
            [Language.HINDI]: 'आपके स्कूल/कॉलेज/संस्थान का नाम क्या है?',
        } as Record<Language, string>,
    },
    course_name: {
        fieldId: 'course_name',
        fieldName: 'Course/Program Name',
        fieldType: 'text',
        required: false,
        question: {
            [Language.ENGLISH]: 'What course or program are you enrolled in?',
            [Language.HINDI]: 'आप किस कोर्स या कार्यक्रम में नामांकित हैं?',
        } as Record<Language, string>,
    },
    spouse_name: {
        fieldId: 'spouse_name',
        fieldName: "Spouse's Name",
        fieldType: 'text',
        required: false,
        question: {
            [Language.ENGLISH]: "What is your spouse's name?",
            [Language.HINDI]: 'आपके जीवन साथी का नाम क्या है?',
        } as Record<Language, string>,
    },
    num_children: {
        fieldId: 'num_children',
        fieldName: 'Number of Children',
        fieldType: 'number',
        required: false,
        question: {
            [Language.ENGLISH]: 'How many children do you have?',
            [Language.HINDI]: 'आपके कितने बच्चे हैं?',
        } as Record<Language, string>,
    },
    business_type: {
        fieldId: 'business_type',
        fieldName: 'Type of Business/Enterprise',
        fieldType: 'text',
        required: false,
        question: {
            [Language.ENGLISH]: 'What type of business or enterprise do you have?',
            [Language.HINDI]: 'आपका व्यवसाय किस प्रकार का है?',
        } as Record<Language, string>,
    },
    registration_number: {
        fieldId: 'registration_number',
        fieldName: 'Registration/License Number',
        fieldType: 'text',
        required: false,
        question: {
            [Language.ENGLISH]: 'What is your registration or license number (if any)?',
            [Language.HINDI]: 'आपका पंजीकरण या लाइसेंस नंबर क्या है (यदि कोई हो)?',
        } as Record<Language, string>,
    },
};

/**
 * Detect which domain-specific fields are relevant based on scheme text
 */
function detectRelevantFields(scheme: CsvScheme): FormField[] {
    const fields: FormField[] = [];
    const combined = `${scheme.eligibility} ${scheme.application} ${scheme.documents} ${scheme.details} ${scheme.tags.join(' ')}`.toLowerCase();

    // Check for occupation-related keywords
    if (combined.match(/farmer|agriculture|kisan|farming|crop|land|hectare/)) {
        fields.push(DOMAIN_FIELDS.occupation);
        fields.push(DOMAIN_FIELDS.land_area);
    }

    // Education-related
    if (combined.match(/student|scholarship|education|school|college|university|course|degree|matric/)) {
        fields.push(DOMAIN_FIELDS.education);
        fields.push(DOMAIN_FIELDS.institution_name);
        fields.push(DOMAIN_FIELDS.course_name);
    }

    // Disability-related
    if (combined.match(/disability|disabled|handicap|divyang|pwd/)) {
        fields.push(DOMAIN_FIELDS.disability);
        fields.push(DOMAIN_FIELDS.disability_percentage);
    }

    // BPL/ration card
    if (combined.match(/bpl|ration card|below poverty|antyodaya|apl/)) {
        fields.push(DOMAIN_FIELDS.ration_card);
    }

    // Women/marriage related
    if (combined.match(/women|marriage|widow|spouse|wife|husband|maternity|pregnant/)) {
        fields.push(DOMAIN_FIELDS.spouse_name);
    }

    // Children related
    if (combined.match(/child|children|daughter|son|girl child|beti/)) {
        fields.push(DOMAIN_FIELDS.num_children);
    }

    // Business/MSME related
    if (combined.match(/msme|business|enterprise|entrepreneur|startup|industry|udyam/)) {
        fields.push(DOMAIN_FIELDS.business_type);
        fields.push(DOMAIN_FIELDS.registration_number);
        fields.push(DOMAIN_FIELDS.occupation);
    }

    // Labour related
    if (combined.match(/labour|labor|worker|construction|building|shramik/)) {
        fields.push(DOMAIN_FIELDS.occupation);
        fields.push(DOMAIN_FIELDS.registration_number);
    }

    return fields;
}

/**
 * Generate a dynamic form template for a scheme
 * Uses keyword detection to add relevant scheme-specific fields to the common fields
 */
export function generateDynamicTemplate(scheme: CsvScheme): FormTemplate {
    // Check cache first
    const cacheKey = scheme.slug || scheme.scheme_name;
    if (templateCache.has(cacheKey)) {
        return templateCache.get(cacheKey)!;
    }

    logger.info('Generating dynamic form template', { scheme: scheme.scheme_name });

    // Start with common fields
    const fields: FormField[] = [...COMMON_FIELDS];

    // Detect and add domain-specific fields
    const domainFields = detectRelevantFields(scheme);
    const existingIds = new Set(fields.map(f => f.fieldId));

    for (const field of domainFields) {
        if (!existingIds.has(field.fieldId)) {
            fields.push(field);
            existingIds.add(field.fieldId);
        }
    }

    const template: FormTemplate = {
        formId: `form-${cacheKey}`,
        schemeId: scheme.slug || scheme.scheme_name,
        formName: scheme.scheme_name,
        version: '1.0',
        fields,
        pdfTemplateUrl: '',
    };

    // Cache it
    templateCache.set(cacheKey, template);

    logger.info('Dynamic template generated', {
        scheme: scheme.scheme_name,
        totalFields: fields.length,
        domainFields: domainFields.length,
    });

    return template;
}

/**
 * Extract the required documents list from scheme data as a structured array
 */
export function extractDocumentChecklist(scheme: CsvScheme): string[] {
    const docsText = scheme.documents;
    if (!docsText) return ['Aadhaar Card', 'Bank Account Details'];

    // Split by common delimiters
    const docs = docsText
        .split(/[,;\n\r•\-\d+\.\)]+/)
        .map(d => d.trim())
        .filter(d => d.length > 3 && d.length < 200);

    return docs.length > 0 ? docs : ['Aadhaar Card', 'Bank Account Details'];
}

/**
 * Get cached template count (for monitoring)
 */
export function getCachedTemplateCount(): number {
    return templateCache.size;
}
