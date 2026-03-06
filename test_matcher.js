const { checkEligibility } = require('./src/services/eligibility/matcher.ts');

const profile = {
    state: "Maharashtra",
    age: 25,
    gender: "male",
    category: "general",
    occupation: "student",
    income: 100000
};

const mockSchemes = [
    {
        schemeId: "scheme-1",
        name: "General Student Scholarship",
        eligibilityCriteria: {
            minAge: 18,
            maxAge: 30,
            gender: ["male", "female"],
            states: ["Maharashtra", "Delhi"],
            category: ["general", "obc"],
            occupation: ["student"],
            income: { max: 500000 }
        },
        benefits: ["Test benefit"],
        documents: ["Aadhaar"]
    },
    {
        schemeId: "scheme-2",
        name: "Maharashtra Youth Scheme",
        eligibilityCriteria: {
            states: ["Maharashtra"],
            minAge: 20,
            maxAge: 35
        },
        benefits: ["Test benefit 2"],
        documents: ["Aadhaar", "Domicile"]
    }
];

async function run() {
    console.log("Testing with profile:", profile);
    try {
        const results = await checkEligibility(profile, mockSchemes);
        console.log("Matches:", results);
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
