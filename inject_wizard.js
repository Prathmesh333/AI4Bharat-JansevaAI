const fs = require('fs');
let html = fs.readFileSync('server/public/index.html', 'utf-8');

// 1. Insert CSS
const cssIndex = html.indexOf('/* Chat Modal */');
const wizardCSS = `
        /* Wizard Modal */
        .wizard-modal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 2000; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
            align-items: center; justify-content: center;
        }
        .wizard-modal.active { display: flex; }
        .wizard-container {
            width: 90%; max-width: 600px; background: #fff; border-radius: 20px;
            overflow: hidden; display: flex; flex-direction: column;
            box-shadow: 0 24px 60px rgba(0,0,0,0.2); max-height: 90vh;
        }
        .wizard-header {
            padding: 24px 32px; border-bottom: 1px solid var(--s200);
            display: flex; justify-content: space-between; align-items: center;
        }
        .wizard-header h2 { font-size: 20px; font-weight: 800; color: var(--s900); }
        .wizard-progress { display: flex; gap: 8px; padding: 24px 32px 0; }
        .wizard-step-dot { height: 6px; flex: 1; border-radius: 4px; background: var(--s200); transition: background 0.3s; }
        .wizard-step-dot.active { background: var(--g600); }
        .wizard-body { padding: 32px; overflow-y: auto; flex: 1; min-height: 300px; }
        .wizard-step { display: none; animation: fadeIn 0.3s; }
        .wizard-step.active { display: block; }
        @keyframes fadeIn { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
        .wizard-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: var(--s900); }
        .wizard-subtitle { font-size: 15px; color: var(--s500); margin-bottom: 24px; }
        .wizard-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;}
        .wizard-option {
            border: 2px solid var(--s200); border-radius: 12px; padding: 16px; cursor: pointer;
            text-align: center; font-weight: 700; color: var(--s700); transition: all 0.2s;
        }
        .wizard-option:hover { border-color: var(--g500); background: var(--g50); color: var(--g700); }
        .wizard-option.selected { border-color: var(--g600); background: var(--g100); color: var(--g800); }
        .wizard-input, .wizard-select {
            width: 100%; padding: 14px 16px; border-radius: 12px; border: 2px solid var(--s200);
            font-family: 'Mulish', sans-serif; font-size: 16px; outline: none; transition: border-color 0.2s; margin-bottom: 24px;
        }
        .wizard-input:focus, .wizard-select:focus { border-color: var(--g500); }
        .wizard-footer {
            padding: 24px 32px; border-top: 1px solid var(--s200);
            display: flex; justify-content: space-between; background: var(--s50);
        }
        .btn-wizard-back {
            background: white; border: 1px solid var(--s300); color: var(--s700);
            padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; display: none;
        }
        .btn-wizard-next {
            background: var(--g700); border: none; color: white;
            padding: 12px 32px; border-radius: 10px; font-weight: 700; cursor: pointer; margin-left: auto;
        }
        .btn-wizard-next:disabled { background: var(--s300); cursor: not-allowed; }
        .scheme-result-card {
            border: 1px solid var(--s200); border-radius: 12px; padding: 20px;
            margin-bottom: 16px; background: white; text-align: left;
        }
        .scheme-result-card h3 { font-size: 18px; font-weight: 800; color: var(--g800); margin-bottom: 8px; }
        .scheme-result-card p { font-size: 14px; color: var(--s600); margin-bottom: 16px; }
        .scheme-result-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .scheme-result-tag { background: var(--g50); color: var(--g700); font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
        
`;
html = html.substring(0, cssIndex) + wizardCSS + html.substring(cssIndex);

// 2. Insert HTML before Chat Modal
const htmlIndex = html.indexOf('<!-- Chat Modal -->');
const wizardHTML = `
    <!-- Wizard Modal -->
    <div class="wizard-modal" id="wizardModal">
        <div class="wizard-container">
            <div class="wizard-header">
                <h2>Find Schemes</h2>
                <button class="close-button" onclick="closeWizard()" style="color: black; border-color: var(--s200); background: var(--s100);">✕</button>
            </div>
            <div class="wizard-progress" id="wizardProgress">
                <div class="wizard-step-dot active"></div>
                <div class="wizard-step-dot"></div>
                <div class="wizard-step-dot"></div>
                <div class="wizard-step-dot"></div>
                <div class="wizard-step-dot"></div>
            </div>
            <div class="wizard-body" id="wizardBody">
                <!-- Step 1: Basic -->
                <div class="wizard-step active" id="wizardStep1">
                    <h3 class="wizard-title">Tell us about yourself</h3>
                    <p class="wizard-subtitle">This helps us find schemes relevant to your state and age.</p>
                    
                    <label style="font-weight:700; margin-bottom:8px; display:block;">Select State</label>
                    <select class="wizard-select" id="wizState" onchange="checkStep1()">
                        <option value="">Select your state...</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="West Bengal">West Bengal</option>
                        <option value="Telangana">Telangana</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Other">Other</option>
                    </select>

                    <label style="font-weight:700; margin-bottom:8px; display:block;">Age</label>
                    <input type="number" class="wizard-input" id="wizAge" placeholder="e.g. 25" oninput="checkStep1()">
                </div>

                <!-- Step 2: Gender & Category -->
                <div class="wizard-step" id="wizardStep2">
                    <h3 class="wizard-title">Gender & Category</h3>
                    <p class="wizard-subtitle">Select your gender and social category to find specific benefits.</p>

                    <label style="font-weight:700; margin-bottom:8px; display:block;">Gender</label>
                    <div class="wizard-grid">
                        <div class="wizard-option" onclick="selectOption('wizGender', this, 'Male')">Male</div>
                        <div class="wizard-option" onclick="selectOption('wizGender', this, 'Female')">Female</div>
                    </div>

                    <label style="font-weight:700; margin-bottom:8px; display:block;">Social Category</label>
                    <div class="wizard-grid">
                        <div class="wizard-option" onclick="selectOption('wizCategory', this, 'General')">General</div>
                        <div class="wizard-option" onclick="selectOption('wizCategory', this, 'OBC')">OBC</div>
                        <div class="wizard-option" onclick="selectOption('wizCategory', this, 'SC')">SC</div>
                        <div class="wizard-option" onclick="selectOption('wizCategory', this, 'ST')">ST</div>
                    </div>
                </div>

                <!-- Step 3: Occupation -->
                <div class="wizard-step" id="wizardStep3">
                    <h3 class="wizard-title">Occupation & Education</h3>
                    <p class="wizard-subtitle">Many schemes are tailored to specific professions or students.</p>

                    <label style="font-weight:700; margin-bottom:8px; display:block;">Current Status</label>
                    <div class="wizard-grid">
                        <div class="wizard-option" onclick="selectOption('wizOccupation', this, 'Student')">Student</div>
                        <div class="wizard-option" onclick="selectOption('wizOccupation', this, 'Farmer')">Farmer</div>
                        <div class="wizard-option" onclick="selectOption('wizOccupation', this, 'Unemployed')">Unemployed</div>
                        <div class="wizard-option" onclick="selectOption('wizOccupation', this, 'Self-Employed')">Self-Employed</div>
                        <div class="wizard-option" onclick="selectOption('wizOccupation', this, 'Govt Employee')">Govt Employee</div>
                        <div class="wizard-option" onclick="selectOption('wizOccupation', this, 'Private Sector')">Private Sector</div>
                    </div>
                </div>

                <!-- Step 4: Income -->
                <div class="wizard-step" id="wizardStep4">
                    <h3 class="wizard-title">Annual Family Income</h3>
                    <p class="wizard-subtitle">Income is a key criteria for most financial assistance schemes.</p>

                    <label style="font-weight:700; margin-bottom:8px; display:block;">Approximate Income (₹)</label>
                    <input type="number" class="wizard-input" id="wizIncome" placeholder="e.g. 250000" oninput="checkStep4()">
                    
                    <div style="background: var(--g50); padding: 12px; border-radius: 8px; display: flex; gap: 12px; align-items: flex-start; margin-top: 16px;">
                        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;color:#f59e0b;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.82 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.496 1.508 1.333 1.508 2.316V18" /></svg>
                        <p style="font-size: 13px; color: var(--g800);">Your data is strictly used for showing eligibility. We do not store any personal information on our servers.</p>
                    </div>
                </div>

                <!-- Step 5: Results -->
                <div class="wizard-step" id="wizardStep5">
                    <h3 class="wizard-title">Matching Schemes</h3>
                    <p class="wizard-subtitle" id="wizResultsSubtitle">Finding best matches for you...</p>

                    <div id="wizResultsContainer">
                        <div style="text-align: center; padding: 40px;">
                            <div class="typing-indicator active" style="justify-content: center; margin-bottom: 16px;"><span></span><span></span><span></span></div>
                            <p style="color: var(--s500); font-weight: 600;">Searching 3,400+ schemes...</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="wizard-footer" id="wizardFooter">
                <button class="btn-wizard-back" id="wizBackBtn" onclick="wizPrevStep()">Back</button>
                <button class="btn-wizard-next" id="wizNextBtn" onclick="wizNextStep()" disabled>Continue</button>
            </div>
        </div>
    </div>

`;
html = html.substring(0, htmlIndex) + wizardHTML + html.substring(htmlIndex);

// 3. Update CTA button to open Wizard instead of Chat directly
html = html.replace('id="ctaBtn" onclick="openChat()">Find Schemes For You', 'id="ctaBtn" onclick="openWizard()">Find Schemes For You');

// 4. Insert JS before closing </body>
const jsIndex = html.lastIndexOf('</body>');
const wizardJS = `
    <script>
        // Wizard Logic
        let currentStep = 1;
        const totalSteps = 5;
        const wizData = { gender: '', category: '', occupation: '' };

        function openWizard() {
            document.getElementById('wizardModal').classList.add('active');
            document.body.style.overflow = 'hidden';
            currentStep = 1;
            updateWizardUI();
        }

        function closeWizard() {
            document.getElementById('wizardModal').classList.remove('active');
            document.body.style.overflow = '';
        }

        function selectOption(key, element, value) {
            wizData[key] = value;
            const siblings = element.parentElement.children;
            for(let el of siblings) el.classList.remove('selected');
            element.classList.add('selected');
            
            if(currentStep === 2 && wizData.gender && wizData.category) {
                document.getElementById('wizNextBtn').disabled = false;
            }
            if(currentStep === 3 && wizData.occupation) {
                document.getElementById('wizNextBtn').disabled = false;
            }
        }

        function checkStep1() {
            const st = document.getElementById('wizState').value;
            const age = document.getElementById('wizAge').value;
            document.getElementById('wizNextBtn').disabled = !(st && age);
        }

        function checkStep4() {
            const inc = document.getElementById('wizIncome').value;
            document.getElementById('wizNextBtn').disabled = !inc;
        }

        function updateWizardUI() {
            // Update dots
            const dots = document.getElementById('wizardProgress').children;
            for(let i=0; i<dots.length; i++) {
                dots[i].className = 'wizard-step-dot' + (i < currentStep ? ' active' : '');
            }

            // Update steps
            for(let i=1; i<=totalSteps; i++) {
                document.getElementById('wizardStep'+i).classList.remove('active');
            }
            document.getElementById('wizardStep'+currentStep).classList.add('active');

            // Update footer
            const backBtn = document.getElementById('wizBackBtn');
            const nextBtn = document.getElementById('wizNextBtn');
            
            backBtn.style.display = currentStep > 1 && currentStep < 5 ? 'block' : 'none';
            
            if(currentStep === 5) {
                document.getElementById('wizardFooter').style.display = 'none';
                fetchResults();
            } else {
                document.getElementById('wizardFooter').style.display = 'flex';
                nextBtn.innerText = currentStep === 4 ? 'Submit' : 'Continue';
                
                // Set disabled based on step requirements
                if(currentStep === 1) checkStep1();
                else if(currentStep === 2) nextBtn.disabled = !(wizData.gender && wizData.category);
                else if(currentStep === 3) nextBtn.disabled = !wizData.occupation;
                else if(currentStep === 4) checkStep4();
            }
        }

        function wizNextStep() {
            if(currentStep < totalSteps) {
                currentStep++;
                updateWizardUI();
            }
        }

        function wizPrevStep() {
            if(currentStep > 1) {
                currentStep--;
                updateWizardUI();
            }
        }

        function fetchResults() {
            const profile = {
                state: document.getElementById('wizState').value,
                age: document.getElementById('wizAge').value,
                gender: wizData.gender,
                caste: wizData.category,
                occupation: wizData.occupation,
                income: document.getElementById('wizIncome').value
            };

            // Use our existing eligibility endpoint!
            fetch('/api/eligibility/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile })
            })
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById('wizResultsContainer');
                if(!data.success || !data.data.eligibleSchemes || data.data.eligibleSchemes.length === 0) {
                    container.innerHTML = '<div style="text-align:center; padding: 40px;"><h3 style="color:var(--s900)">No instant exact matches</h3><p style="color:var(--s500); margin-top:8px;">You can browse the full directory or ask our AI to help you search broadly.</p><div style="display:flex; justify-content:center; gap:16px; margin-top: 24px;"><button class="btn-primary" onclick="window.location.href=\\'/search.html\\'">Browse Directory</button><button class="btn-wizard-back" style="display:inline-block" onclick="closeWizard(); openChat();">Talk to AI</button></div></div>';
                    document.getElementById('wizResultsSubtitle').innerText = '0 immediate matches found';
                    return;
                }

                const schemes = data.data.eligibleSchemes;
                document.getElementById('wizResultsSubtitle').innerText = 'Found ' + schemes.length + ' schemes you might be eligible for';
                
                let html = '';
                schemes.forEach((sm, idx) => {
                    const basicTitle = sm.title || sm.schemeName || 'Government Scheme';
                    const catTitle = sm.category || 'General';
                    const cleanTitle = basicTitle.replace(/^\\[\\d+\\]\\s*/, '');
                    const slugId = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    
                    html += \`
                        <div class="scheme-result-card">
                            <h3>\${cleanTitle}</h3>
                            <div class="scheme-result-tags">
                                <span class="scheme-result-tag">\${catTitle}</span>
                            </div>
                            <p>\${(sm.description || sm.reason || 'Click below to learn more about this scheme').substring(0, 150)}...</p>
                            
                            <div style="display:flex; gap: 8px; margin-top: 1rem;">
                                <button class="btn-primary" style="flex:1" onclick="window.location.href='/scheme.html?slug=\${slugId}'">Full Details</button>
                                <button class="btn-wizard-back" style="flex:1" onclick="chatAboutScheme('\${cleanTitle.replace(/'/g, "\\'")}')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;display:inline;vertical-align:bottom">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    Chat
                                </button>
                            </div>
                        </div>
                    \`;
                });
                container.innerHTML = html;
            })
            .catch(err => {
                document.getElementById('wizResultsContainer').innerHTML = '<div style="text-align:center; padding: 20px; color: red;">Failed to load schemes. Please try chatting directly with the AI, or browse the directory. <br><button onclick="window.location.href=\\'/search.html\\'">Go to Directory</button></div>';
            });
        }

        function chatAboutScheme(schemeName) {
            closeWizard();
            openChat();
            setTimeout(() => {
                document.getElementById('messageInput').value = 'Tell me everything about ' + schemeName + ', check my eligibility and give me the application form.';
                sendMessage();
            }, 1000);
        }
    </script>
`;
html = html.substring(0, jsIndex) + wizardJS + html.substring(jsIndex);

fs.writeFileSync('server/public/index.html', html, 'utf-8');
console.log('Wizard UI added successfully!');
