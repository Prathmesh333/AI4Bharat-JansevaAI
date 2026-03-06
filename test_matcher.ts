import 'dotenv/config';
import { initializeDatabase, advancedSearch } from './src/services/schemes/schemeDatabase';
import { evaluateEligibilityRAG } from './server/gemini';
import { extractDocumentChecklist } from './src/services/form/dynamicTemplate';
import * as path from 'path';

const profile: any = {
    state: "Maharashtra",
    age: 25,
    gender: "male",
    category: "general",
    occupation: "student",
    income: 100000
};

async function run() {
    console.log("Initializing DB...");
    await initializeDatabase(path.resolve(__dirname, 'dataset', 'updated_data.csv'));

    console.log("Fetching matching schemes for profile...");
    const csvSchemes = advancedSearch({
        category: profile.category,
        limit: 40,
    });

    console.log(`Found ${csvSchemes.length} basic scheme matches. Formatting for RAG...`);
    const schemes = csvSchemes.map(s => ({
        schemeId: s.slug || s.scheme_name.toLowerCase().replace(/\s+/g, '-').substring(0, 30),
        name: s.scheme_name,
        nameTranslations: {} as any,
        description: s.details,
        descriptionTranslations: {} as any,
        ministry: 'Government',
        category: s.schemeCategory,
        benefits: [s.benefits.substring(0, 200)],
        eligibilityCriteria: {} as any,
        documents: extractDocumentChecklist(s),
        applicationProcess: s.application.substring(0, 300),
        officialUrl: s.officialUrl,
        lastUpdated: Date.now(),
        rawEligibility: s.eligibility,
    }));

    console.log("Calling Gemini RAG evaluator! Depending on network this takes a while...");
    try {
        const results = await evaluateEligibilityRAG(profile, schemes as any);
        console.log(`\nRAG Evaluator complete! Found ${results.length} eligible schemes:\n`);
        results.forEach(r => console.log(`- ${r.schemeName} (Score: ${r.matchScore})`));
    } catch (e) {
        console.error("Evaluation Failed:", e);
    }
}

run();
