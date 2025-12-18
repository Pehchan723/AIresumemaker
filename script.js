
        let profileImageData = null;
        let originalImageData = null;
        let imageAdjustments = { scale: 1, brightness: 1, contrast: 1 };
        let facePosition = null;
        let isModelLoaded = false;

        // Initialize with sample data and load face-api.js models
        window.addEventListener('load', async function() {
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/');
                isModelLoaded = true;
            } catch (error) {
                console.error('Failed to load face-api.js model:', error);
                // Proceed without face detection if model fails to load
                isModelLoaded = false;
            }
            setupImageUpload();
            updatePreview();
        });

        // Image upload functionality
        function setupImageUpload() {
            const uploadArea = document.getElementById('imageUploadArea');
            const fileInput = document.getElementById('profileImageInput');
            const preview = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            const imageControls = document.getElementById('imageControls');

            // File input change event
            fileInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files.length > 0) {
                    handleImageFile(e.target.files[0]);
                }
            });

            // Drag and drop events
            uploadArea.addEventListener('dragover', function(e) {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', function(e) {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', function(e) {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleImageFile(files[0]);
                }
            });
        }

        async function handleImageFile(file) {
            if (!file || !file.type.startsWith('image/')) {
                alert('Please select a valid image file');
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                alert('Image size should be less than 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = async function(e) {
                originalImageData = e.target.result;
                const img = new Image();
                img.src = originalImageData;

                img.onerror = function() {
                    alert('Failed to load the image. Please try another file.');
                    return;
                };

                img.onload = async function() {
                    try {
                        // Detect face if model is loaded
                        if (isModelLoaded) {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);

                            const detections = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions());
                            if (detections) {
                                facePosition = {
                                    x: detections.box.x + detections.box.width / 2,
                                    y: detections.box.y + detections.box.height / 2,
                                    width: detections.box.width,
                                    height: detections.box.height
                                };
                            } else {
                                // Fallback to center of image if no face detected
                                facePosition = {
                                    x: img.width / 2,
                                    y: img.height / 2,
                                    width: img.width / 2,
                                    height: img.height / 2
                                };
                            }
                        } else {
                            // Fallback if model not loaded
                            facePosition = {
                                x: img.width / 2,
                                y: img.height / 2,
                                width: img.width / 2,
                                height: img.height / 2
                            };
                        }

                        // Process image to focus on face in circular format
                        profileImageData = await processImageForCircularDisplay(img);
                        document.getElementById('previewImg').src = profileImageData;
                        document.getElementById('imagePreview').style.display = 'block';
                        document.getElementById('imageControls').style.display = 'block';
                        updatePreview();
                    } catch (error) {
                        console.error('Error processing image:', error);
                        // Fallback to basic image display without face detection
                        facePosition = {
                            x: img.width / 2,
                            y: img.height / 2,
                            width: img.width / 2,
                            height: img.height / 2
                        };
                        profileImageData = await processImageForCircularDisplay(img);
                        document.getElementById('previewImg').src = profileImageData;
                        document.getElementById('imagePreview').style.display = 'block';
                        document.getElementById('imageControls').style.display = 'block';
                        updatePreview();
                    }
                };
            };
            reader.onerror = function() {
                alert('Failed to read the image file. Please try again.');
            };
            reader.readAsDataURL(file);
        }

        async function processImageForCircularDisplay(img) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const targetSize = 100; // Matches .image-preview size
            canvas.width = targetSize;
            canvas.height = targetSize;

            // Calculate scaling and positioning to center the face
            const faceWidth = facePosition.width;
            const faceHeight = facePosition.height;
            const scale = Math.max(targetSize / faceWidth, targetSize / faceHeight) * 1.2; // Slight zoom for better face coverage
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;

            // Center the face in the canvas
            const offsetX = (targetSize - scaledWidth) / 2 - (facePosition.x * scale - scaledWidth / 2);
            const offsetY = (targetSize - scaledHeight) / 2 - (facePosition.y * scale - scaledHeight / 2);

            // Draw image with face centered
            ctx.beginPath();
            ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
            return canvas.toDataURL('image/png');
        }

        function removeImage() {
            profileImageData = null;
            originalImageData = null;
            facePosition = null;
            imageAdjustments = { scale: 1, brightness: 1, contrast: 1 };
            document.getElementById('previewImg').src = '';
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('imageControls').style.display = 'none';
            document.getElementById('profileImageInput').value = '';
            updatePreview();
        }

        function adjustImage() {
            if (!originalImageData) {
                alert('Please upload an image first.');
                return;
            }

            const modal = document.getElementById('imageAdjustModal');
            const canvas = document.getElementById('imageAdjustCanvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = originalImageData;

            img.onerror = function() {
                alert('Failed to load the image for adjustment. Please try again.');
                return;
            };

            img.onload = function() {
                // Set canvas size to maintain aspect ratio
                const maxCanvasSize = 400;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxCanvasSize) {
                        height = Math.round((height * maxCanvasSize) / width);
                        width = maxCanvasSize;
                    }
                } else {
                    if (height > maxCanvasSize) {
                        width = Math.round((width * maxCanvasSize) / height);
                        height = maxCanvasSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;

                // Draw initial image
                drawAdjustedImage(canvas, ctx, img);

                // Add event listeners for adjustments
                document.getElementById('imageScale').addEventListener('input', () => {
                    imageAdjustments.scale = parseFloat(document.getElementById('imageScale').value);
                    drawAdjustedImage(canvas, ctx, img);
                });
                document.getElementById('imageBrightness').addEventListener('input', () => {
                    imageAdjustments.brightness = parseFloat(document.getElementById('imageBrightness').value);
                    drawAdjustedImage(canvas, ctx, img);
                });
                document.getElementById('imageContrast').addEventListener('input', () => {
                    imageAdjustments.contrast = parseFloat(document.getElementById('imageContrast').value);
                    drawAdjustedImage(canvas, ctx, img);
                });

                modal.style.display = 'flex';
            };
        }

        function drawAdjustedImage(canvas, ctx, img) {
            const { scale, brightness, contrast } = imageAdjustments;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Apply scaling while maintaining aspect ratio
            let drawWidth = canvas.width * scale;
            let drawHeight = canvas.height * scale;
            let offsetX = (canvas.width - drawWidth) / 2;
            let offsetY = (canvas.height - drawHeight) / 2;

            ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            ctx.filter = 'none';
        }

        async function applyImageAdjustments() {
            const canvas = document.getElementById('imageAdjustCanvas');
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const img = new Image();
            img.src = originalImageData;

            img.onerror = function() {
                alert('Failed to apply image adjustments. Please try again.');
                closeImageAdjustModal();
                return;
            };

            img.onload = async function() {
                try {
                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    const { scale, brightness, contrast } = imageAdjustments;
                    tempCtx.filter = `brightness(${brightness}) contrast(${contrast})`;
                    const drawWidth = img.width * scale;
                    const drawHeight = img.height * scale;
                    const offsetX = (img.width - drawWidth) / 2;
                    const offsetY = (img.height - drawHeight) / 2;
                    tempCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                    tempCtx.filter = 'none';
                    originalImageData = tempCanvas.toDataURL('image/png');
                    profileImageData = await processImageForCircularDisplay(img);
                    document.getElementById('previewImg').src = profileImageData;
                    updatePreview();
                    closeImageAdjustModal();
                } catch (error) {
                    console.error('Error applying image adjustments:', error);
                    alert('Failed to apply image adjustments. Please try again.');
                    closeImageAdjustModal();
                }
            };
        }

        function closeImageAdjustModal() {
            const modal = document.getElementById('imageAdjustModal');
            modal.style.display = 'none';
        }

        function removeBackground() {
            if (!originalImageData) {
                alert('Please upload an image first.');
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = originalImageData;

            img.onerror = function() {
                alert('Failed to process background removal. Please try again.');
                return;
            };

            img.onload = async function() {
                try {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    // Simple background removal (assumes background is relatively uniform)
                    const threshold = 200; // Adjust based on testing
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        // Consider light colors (near white) as background
                        if (r > threshold && g > threshold && b > threshold) {
                            data[i + 3] = 0; // Set alpha to 0 (transparent)
                        }
                    }

                    ctx.putImageData(imageData, 0, 0);
                    originalImageData = canvas.toDataURL('image/png');
                    profileImageData = await processImageForCircularDisplay(img);
                    document.getElementById('previewImg').src = profileImageData;
                    updatePreview();
                } catch (error) {
                    console.error('Error removing background:', error);
                    alert('Failed to remove background. Please try again.');
                }
            };
        }

        // Add entry functions
        function addEducationEntry() {
            const entries = document.getElementById('educationEntries');
            const entry = document.createElement('div');
            entry.className = 'entry';
            entry.innerHTML = `
                <h4>Education Entry</h4>
                <div class="form-row">
                    <input type="text" class="education-degree" placeholder="Degree (e.g., Bachelor of Science)">
                    <input type="text" class="education-field" placeholder="Field of Study">
                </div>
                <div class="form-row">
                    <input type="text" class="education-university" placeholder="University/Institution">
                    <input type="text" class="education-year" placeholder="Year (e.g., 2018-2022)">
                </div>
                <div class="form-row">
                    <input type="text" class="education-grade" placeholder="Grade/GPA (optional)">
                    <input type="text" class="education-location" placeholder="Location">
                </div>
                <button type="button" class="remove-btn" onclick="removeEntry(this.parentElement)">Remove</button>
            `;
            entries.appendChild(entry);
        }

        function addExperienceEntry() {
            const entries = document.getElementById('experienceEntries');
            const entry = document.createElement('div');
            entry.className = 'entry';
            entry.innerHTML = `
                <h4>Experience Entry</h4>
                <div class="form-row">
                    <input type="text" class="experience-title" placeholder="Job Title">
                    <input type="text" class="experience-company" placeholder="Company Name">
                </div>
                <div class="form-row">
                    <input type="text" class="experience-duration" placeholder="Duration (e.g., Jan 2020 - Dec 2022)">
                    <input type="text" class="experience-location" placeholder="Location">
                </div>
                <textarea class="experience-responsibilities" placeholder="Key responsibilities and achievements (use bullet points)"></textarea>
                <button type="button" class="ai-suggest-btn" onclick="suggestResponsibilities(this)">AI Generate Responsibilities</button>
                <button type="button" class="remove-btn" onclick="removeEntry(this.parentElement)">Remove</button>
            `;
            entries.appendChild(entry);
        }

        function addSkillEntry() {
            const entries = document.getElementById('skillsEntries');
            const entry = document.createElement('div');
            entry.className = 'entry';
            entry.innerHTML = `
                <input type="text" class="skill-entry" placeholder="e.g., JavaScript, Project Management">
                <button type="button" class="remove-btn" onclick="removeEntry(this.parentElement)">Remove</button>
            `;
            entries.appendChild(entry);
        }

        function addLanguageEntry() {
            const entries = document.getElementById('languagesEntries');
            const entry = document.createElement('div');
            entry.className = 'entry';
            entry.innerHTML = `
                <input type="text" class="language-entry" placeholder="e.g., English, Spanish">
                <button type="button" class="remove-btn" onclick="removeEntry(this.parentElement)">Remove</button>
            `;
            entries.appendChild(entry);
        }

        function addHobbyEntry() {
            const entries = document.getElementById('hobbiesEntries');
            const entry = document.createElement('div');
            entry.className = 'entry';
            entry.innerHTML = `
                <input type="text" class="hobby-entry" placeholder="e.g., Photography, Cooking">
                <button type="button" class="remove-btn" onclick="removeEntry(this.parentElement)">Remove</button>
            `;
            entries.appendChild(entry);
        }

        // Remove entry function
        function removeEntry(entry) {
            entry.remove();
            updatePreview();
        }

        // Enhanced AI suggestion functions
        function suggestProfile() {
            const name = document.getElementById('name').value || 'Professional';
            const jobTitle = document.getElementById('jobTitle').value || 'Professional';
            
            // Get work experience for context
            const experienceEntries = document.querySelectorAll('#experienceEntries .entry');
            let experienceYears = 0;
            let skills = [];
            let industries = [];

            experienceEntries.forEach(entry => {
                const title = entry.querySelector('.experience-title')?.value || '';
                const company = entry.querySelector('.experience-company')?.value || '';
                const duration = entry.querySelector('.experience-duration')?.value || '';
                
                if (title) skills.push(title.toLowerCase());
                if (company) industries.push(company);
                
                // Simple year calculation from duration
                const yearMatch = duration.match(/(\d{4})/g);
                if (yearMatch && yearMatch.length >= 2) {
                    experienceYears = Math.max(experienceYears, parseInt(yearMatch[yearMatch.length - 1]) - parseInt(yearMatch[0]));
                }
            });

            // Get education for context
            const educationEntries = document.querySelectorAll('#educationEntries .entry');
            let educationLevel = '';
            educationEntries.forEach(entry => {
                const degree = entry.querySelector('.education-degree')?.value || '';
                if (degree.toLowerCase().includes('master')) educationLevel = 'advanced';
                else if (degree.toLowerCase().includes('bachelor')) educationLevel = 'undergraduate';
                else if (degree.toLowerCase().includes('phd') || degree.toLowerCase().includes('doctorate')) educationLevel = 'doctoral';
            });

            // Generate contextual profile
            let profile = '';
            const experienceText = experienceYears > 0 ? `${experienceYears}+ years of experience` : 'proven track record';
            const educationText = educationLevel === 'advanced' ? 'with advanced academic credentials' : 
                                 educationLevel === 'doctoral' ? 'with doctoral-level expertise' : '';

            if (jobTitle.toLowerCase().includes('engineer') || jobTitle.toLowerCase().includes('developer')) {
                profile = `Results-driven ${jobTitle} with ${experienceText} in software development and technical problem-solving. Specialized in creating innovative solutions that drive business growth and improve user experiences. ${educationText} Passionate about leveraging cutting-edge technologies to deliver high-quality, scalable applications.`;
            } else if (jobTitle.toLowerCase().includes('designer')) {
                profile = `Creative and detail-oriented ${jobTitle} with ${experienceText} in creating compelling visual solutions. Expert in user-centered design principles and modern design tools. ${educationText} Committed to crafting intuitive and aesthetically pleasing experiences that resonate with target audiences.`;
            } else if (jobTitle.toLowerCase().includes('manager')) {
                profile = `Strategic ${jobTitle} with ${experienceText} in leading cross-functional teams and driving operational excellence. Proven ability to optimize processes, mentor talent, and deliver results that exceed organizational objectives. ${educationText} Skilled in stakeholder management and change leadership.`;
            } else if (jobTitle.toLowerCase().includes('analyst')) {
                profile = `Data-driven ${jobTitle} with ${experienceText} in transforming complex information into actionable insights. Expertise in analytical tools and methodologies to support strategic decision-making. ${educationText} Strong background in statistical analysis and business intelligence.`;
            } else {
                profile = `Accomplished ${jobTitle} with ${experienceText} in delivering exceptional results across diverse projects. Known for strong problem-solving abilities, attention to detail, and collaborative approach. ${educationText} Seeking opportunities to contribute expertise and drive meaningful impact in a dynamic organization.`;
            }

            document.getElementById('profile').value = profile;
            updatePreview();
        }

        function suggestResponsibilities(button) {
            const entry = button.closest('.entry');
            const title = entry.querySelector('.experience-title')?.value || '';
            const company = entry.querySelector('.experience-company')?.value || '';
            const responsibilitiesField = entry.querySelector('.experience-responsibilities');

            if (!title) {
                alert('Please enter a job title first to generate relevant responsibilities.');
                return;
            }

            let responsibilities = '';
            const jobTitle = title.toLowerCase();

            if (jobTitle.includes('engineer') || jobTitle.includes('developer')) {
                responsibilities = `Developed and maintained scalable web applications using modern frameworks and technologies
Collaborated with cross-functional teams to design and implement new features
Optimized application performance, resulting in 25% improvement in load times
Conducted code reviews and mentored junior developers to ensure best practices
Participated in agile development processes and sprint planning sessions`;
            } else if (jobTitle.includes('designer')) {
                responsibilities = `Created user-centered designs for web and mobile applications
Conducted user research and usability testing to inform design decisions
Collaborated with development teams to ensure design feasibility and implementation
Developed design systems and style guides to maintain brand consistency
Presented design concepts to stakeholders and incorporated feedback effectively`;
            } else if (jobTitle.includes('manager')) {
                responsibilities = `Led cross-functional team of 8+ professionals to achieve project deliverables
Developed and implemented strategic initiatives that increased efficiency by 30%
Managed budgets and resources while ensuring projects stayed within scope and timeline
Conducted performance reviews and provided coaching to team members
Facilitated communication between departments to ensure alignment with business objectives`;
            } else if (jobTitle.includes('analyst')) {
                responsibilities = `Analyzed complex datasets to identify trends and patterns for business insights
Created comprehensive reports and dashboards for executive leadership
Collaborated with stakeholders to understand business requirements and translate them into analytical solutions
Developed predictive models that improved forecasting accuracy by 20%
Presented findings to senior management and provided actionable recommendations`;
            } else if (jobTitle.includes('sales')) {
                responsibilities = `Achieved 120% of annual sales targets through strategic client relationship management
Identified and pursued new business opportunities in target markets
Developed and delivered compelling sales presentations to key decision makers
Maintained CRM system and tracked sales pipeline metrics
Collaborated with marketing team to develop lead generation strategies`;
            } else if (jobTitle.includes('marketing')) {
                responsibilities = `Developed and executed integrated marketing campaigns across multiple channels
Analyzed market trends and consumer behavior to inform strategy decisions
Managed social media presence and increased engagement by 40%
Coordinated with design and content teams to create compelling marketing materials
Tracked campaign performance metrics and optimized for improved ROI`;
            } else {
                responsibilities = `Executed key responsibilities aligned with organizational objectives and industry standards
Collaborated effectively with team members to achieve project milestones
Maintained high-quality work standards while meeting tight deadlines
Contributed to process improvements that enhanced operational efficiency
Communicated regularly with stakeholders to ensure alignment and transparency`;
            }

            responsibilitiesField.value = responsibilities;
            updatePreview();
        }

        function suggestEducation() {
            const jobTitle = document.getElementById('jobTitle').value || '';
            const entries = document.querySelectorAll('#educationEntries .entry');
            let targetEntry = null;

            // Find an empty entry or create a new one
            for (let entry of entries) {
                const degree = entry.querySelector('.education-degree').value;
                const university = entry.querySelector('.education-university').value;
                if (!degree && !university) {
                    targetEntry = entry;
                    break;
                }
            }

            if (!targetEntry) {
                addEducationEntry();
                const allEntries = document.querySelectorAll('#educationEntries .entry');
                targetEntry = allEntries[allEntries.length - 1];
            }

            // Suggest education based on job title
            const jobTitleLower = jobTitle.toLowerCase();
            if (jobTitleLower.includes('engineer') || jobTitleLower.includes('developer')) {
                targetEntry.querySelector('.education-degree').value = 'Bachelor of Science';
                targetEntry.querySelector('.education-field').value = 'Computer Science';
                targetEntry.querySelector('.education-university').value = 'State University';
                targetEntry.querySelector('.education-year').value = '2018-2022';
                targetEntry.querySelector('.education-grade').value = '3.7 GPA';
                targetEntry.querySelector('.education-location').value = 'New York';
            } else if (jobTitleLower.includes('designer')) {
                targetEntry.querySelector('.education-degree').value = 'Bachelor of Fine Arts';
                targetEntry.querySelector('.education-field').value = 'Graphic Design';
                targetEntry.querySelector('.education-university').value = 'Art Institute';
                targetEntry.querySelector('.education-year').value = '2017-2021';
                targetEntry.querySelector('.education-grade').value = '3.8 GPA';
                targetEntry.querySelector('.education-location').value = 'California';
            } else if (jobTitleLower.includes('manager')) {
                targetEntry.querySelector('.education-degree').value = 'Master of Business Administration';
                targetEntry.querySelector('.education-field').value = 'Business Management';
                targetEntry.querySelector('.education-university').value = 'Business School';
                targetEntry.querySelector('.education-year').value = '2019-2021';
                targetEntry.querySelector('.education-grade').value = '3.9 GPA';
                targetEntry.querySelector('.education-location').value = 'New York';
            } else if (jobTitleLower.includes('analyst')) {
                targetEntry.querySelector('.education-degree').value = 'Bachelor of Science';
                targetEntry.querySelector('.education-field').value = 'Data Science';
                targetEntry.querySelector('.education-university').value = 'Tech University';
                targetEntry.querySelector('.education-year').value = '2018-2022';
                targetEntry.querySelector('.education-grade').value = '3.6 GPA';
                targetEntry.querySelector('.education-location').value = 'Boston';
            } else {
                targetEntry.querySelector('.education-degree').value = 'Bachelor of Arts';
                targetEntry.querySelector('.education-field').value = 'Business Administration';
                targetEntry.querySelector('.education-university').value = 'State University';
                targetEntry.querySelector('.education-year').value = '2018-2022';
                targetEntry.querySelector('.education-grade').value = '3.5 GPA';
                targetEntry.querySelector('.education-location').value = 'New York';
            }
            
            updatePreview();
        }

        function suggestExperience() {
            const jobTitle = document.getElementById('jobTitle').value || 'Professional';
            const entries = document.querySelectorAll('#experienceEntries .entry');
            let targetEntry = null;

            // Find an empty entry or create a new one
            for (let entry of entries) {
                const title = entry.querySelector('.experience-title').value;
                const company = entry.querySelector('.experience-company').value;
                if (!title && !company) {
                    targetEntry = entry;
                    break;
                }
            }

            if (!targetEntry) {
                addExperienceEntry();
                const allEntries = document.querySelectorAll('#experienceEntries .entry');
                targetEntry = allEntries[allEntries.length - 1];
            }

            // Suggest experience based on job title
            const jobTitleLower = jobTitle.toLowerCase();
            if (jobTitleLower.includes('engineer') || jobTitleLower.includes('developer')) {
                targetEntry.querySelector('.experience-title').value = 'Software Engineer';
                targetEntry.querySelector('.experience-company').value = 'Tech Solutions Inc.';
                targetEntry.querySelector('.experience-duration').value = 'Jan 2022 - Present';
                targetEntry.querySelector('.experience-location').value = 'New York';
            } else if (jobTitleLower.includes('designer')) {
                targetEntry.querySelector('.experience-title').value = 'UX Designer';
                targetEntry.querySelector('.experience-company').value = 'Creative Agency';
                targetEntry.querySelector('.experience-duration').value = 'Mar 2021 - Present';
                targetEntry.querySelector('.experience-location').value = 'San Francisco';
            } else if (jobTitleLower.includes('manager')) {
                targetEntry.querySelector('.experience-title').value = 'Project Manager';
                targetEntry.querySelector('.experience-company').value = 'Global Corp';
                targetEntry.querySelector('.experience-duration').value = 'Jun 2020 - Present';
                targetEntry.querySelector('.experience-location').value = 'Chicago';
            } else {
                targetEntry.querySelector('.experience-title').value = jobTitle || 'Professional';
                targetEntry.querySelector('.experience-company').value = 'Leading Company';
                targetEntry.querySelector('.experience-duration').value = 'Jan 2021 - Present';
                targetEntry.querySelector('.experience-location').value = 'New York';
            }
            
            // Auto-generate responsibilities
            suggestResponsibilities(targetEntry.querySelector('.ai-suggest-btn'));
        }

        function suggestSkills() {
            const jobTitle = document.getElementById('jobTitle').value || '';
            const existingSkills = Array.from(document.querySelectorAll('.skill-entry')).map(input => input.value.toLowerCase());
            
            let suggestedSkills = [];
            const jobTitleLower = jobTitle.toLowerCase();

            if (jobTitleLower.includes('engineer') || jobTitleLower.includes('developer')) {
                suggestedSkills = ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'AWS', 'Docker'];
            } else if (jobTitleLower.includes('designer')) {
                suggestedSkills = ['Figma', 'Adobe Creative Suite', 'Sketch', 'Prototyping', 'User Research', 'Wireframing', 'UI/UX Design', 'InVision'];
            } else if (jobTitleLower.includes('manager')) {
                suggestedSkills = ['Project Management', 'Leadership', 'Strategic Planning', 'Team Building', 'Budget Management', 'Agile', 'Scrum', 'Communication'];
            } else if (jobTitleLower.includes('analyst')) {
                suggestedSkills = ['Excel', 'SQL', 'Tableau', 'Power BI', 'Python', 'R', 'Statistics', 'Data Visualization'];
            } else if (jobTitleLower.includes('marketing')) {
                suggestedSkills = ['Digital Marketing', 'SEO', 'Google Analytics', 'Social Media', 'Content Creation', 'Email Marketing', 'PPC', 'Marketing Automation'];
            } else {
                suggestedSkills = ['Communication', 'Problem Solving', 'Teamwork', 'Time Management', 'Adaptability', 'Critical Thinking', 'Customer Service', 'Microsoft Office'];
            }

            // Add only new skills
            const entries = document.querySelectorAll('#skillsEntries .entry');
            let entryIndex = 0;
            
            suggestedSkills.forEach(skill => {
                if (!existingSkills.includes(skill.toLowerCase())) {
                    if (entryIndex >= entries.length) {
                        addSkillEntry();
                    }
                    const currentEntries = document.querySelectorAll('#skillsEntries .entry');
                    const skillInput = currentEntries[entryIndex].querySelector('.skill-entry');
                    if (!skillInput.value) {
                        skillInput.value = skill;
                        entryIndex++;
                    }
                }
            });
            
            updatePreview();
        }

        function suggestLanguages() {
            const entries = document.querySelectorAll('#languagesEntries .entry');
            const suggestions = ['English (Native)', 'Spanish (Conversational)', 'French (Basic)'];
            
            let entryIndex = 0;
            suggestions.forEach(language => {
                if (entryIndex >= entries.length) {
                    addLanguageEntry();
                }
                const currentEntries = document.querySelectorAll('#languagesEntries .entry');
                const languageInput = currentEntries[entryIndex].querySelector('.language-entry');
                if (!languageInput.value) {
                    languageInput.value = language;
                    entryIndex++;
                }
            });
            updatePreview();
        }

        function suggestHobbies() {
            const jobTitle = document.getElementById('jobTitle').value || '';
            const entries = document.querySelectorAll('#hobbiesEntries .entry');
            let suggestions = [];
            
            const jobTitleLower = jobTitle.toLowerCase();
            if (jobTitleLower.includes('engineer') || jobTitleLower.includes('developer')) {
                suggestions = ['Coding Personal Projects', 'Gaming', 'Technology Blogging', 'Open Source Contributing'];
            } else if (jobTitleLower.includes('designer')) {
                suggestions = ['Photography', 'Digital Art', 'Sketching', 'Art Galleries'];
            } else if (jobTitleLower.includes('manager')) {
                suggestions = ['Reading Business Books', 'Networking', 'Public Speaking', 'Mentoring'];
            } else {
                suggestions = ['Reading', 'Hiking', 'Cooking', 'Traveling'];
            }
            
            let entryIndex = 0;
            suggestions.forEach(hobby => {
                if (entryIndex >= entries.length) {
                    addHobbyEntry();
                }
                const currentEntries = document.querySelectorAll('#hobbiesEntries .entry');
                const hobbyInput = currentEntries[entryIndex].querySelector('.hobby-entry');
                if (!hobbyInput.value) {
                    hobbyInput.value = hobby;
                    entryIndex++;
                }
            });
            updatePreview();
        }

        // Real-time preview update
        function updatePreview() {
            const name = document.getElementById('name').value || 'MAX JOHNSON';
            const jobTitle = document.getElementById('jobTitle').value || 'UX Designer';
            const email = document.getElementById('email').value || 'max.johnson@email.com';
            const phone = document.getElementById('phone').value || '+1 2345 6789';
            const address = document.getElementById('address').value || 'New York, USA';
            const profile = document.getElementById('profile').value || 'Experienced professional specializing in delivering exceptional results and driving innovation.';

            // Update profile image
            const profileImagePreview = document.getElementById('profileImagePreview');
            if (profileImageData) {
                profileImagePreview.innerHTML = `<img src="${profileImageData}" alt="Profile Picture">`;
            } else {
                profileImagePreview.innerHTML = '👤';
            }

            // Update basic info
            document.getElementById('previewName').textContent = name;
            document.getElementById('previewNameRight').textContent = name;
            document.getElementById('previewJobTitle').textContent = jobTitle;
            document.getElementById('previewEmail').textContent = email;
            document.getElementById('previewPhone').textContent = phone;
            document.getElementById('previewAddress').textContent = address;
            document.getElementById('previewProfile').textContent = profile;

            // Update education
            const educationDiv = document.getElementById('previewEducation');
            educationDiv.innerHTML = '';
            const educationEntries = document.querySelectorAll('#educationEntries .entry');
            educationEntries.forEach(entry => {
                const degree = entry.querySelector('.education-degree')?.value || '';
                const field = entry.querySelector('.education-field')?.value || '';
                const university = entry.querySelector('.education-university')?.value || '';
                const year = entry.querySelector('.education-year')?.value || '';
                const location = entry.querySelector('.education-location')?.value || '';

                if (degree || university) {
                    const eduItem = document.createElement('div');
                    eduItem.className = 'education-item';
                    eduItem.innerHTML = `
                        <h4>${degree}${field ? ' in ' + field : ''}</h4>
                        <div class="education-meta">${university}${location ? ' - ' + location : ''} | ${year}</div>
                    `;
                    educationDiv.appendChild(eduItem);
                }
            });

            // Update experience
            const experienceDiv = document.getElementById('previewExperience');
            experienceDiv.innerHTML = '';
            const experienceEntries = document.querySelectorAll('#experienceEntries .entry');
            experienceEntries.forEach(entry => {
                const title = entry.querySelector('.experience-title')?.value || '';
                const company = entry.querySelector('.experience-company')?.value || '';
                const duration = entry.querySelector('.experience-duration')?.value || '';
                const location = entry.querySelector('.experience-location')?.value || '';
                const responsibilities = entry.querySelector('.experience-responsibilities')?.value || '';

                if (title || company) {
                    const expItem = document.createElement('div');
                    expItem.className = 'experience-item';
                    
                    let responsibilitiesList = '';
                    if (responsibilities) {
                        const lines = responsibilities.split('\n').filter(line => line.trim());
                        responsibilitiesList = '<ul>' + lines.map(line => `<li>${line.trim()}</li>`).join('') + '</ul>';
                    }
                    
                    expItem.innerHTML = `
                        <h4>${title}</h4>
                        <div class="experience-meta">${company}${location ? ' - ' + location : ''} | ${duration}</div>
                        ${responsibilitiesList}
                    `;
                    experienceDiv.appendChild(expItem);
                }
            });

            // Update skills
            const skillsList = document.getElementById('previewSkills');
            skillsList.innerHTML = '';
            const skillEntries = document.querySelectorAll('.skill-entry');
            skillEntries.forEach(entry => {
                const skill = entry.value.trim();
                if (skill) {
                    const li = document.createElement('li');
                    li.textContent = skill;
                    skillsList.appendChild(li);
                }
            });

            // Update languages
            const languagesList = document.getElementById('previewLanguages');
            languagesList.innerHTML = '';
            const languageEntries = document.querySelectorAll('.language-entry');
            languageEntries.forEach(entry => {
                const language = entry.value.trim();
                if (language) {
                    const li = document.createElement('li');
                    li.textContent = language;
                    languagesList.appendChild(li);
                }
            });

            // Update hobbies
            const hobbiesList = document.getElementById('previewHobbies');
            hobbiesList.innerHTML = '';
            const hobbyEntries = document.querySelectorAll('.hobby-entry');
            hobbyEntries.forEach(entry => {
                const hobby = entry.value.trim();
                if (hobby) {
                    const li = document.createElement('li');
                    li.textContent = hobby;
                    hobbiesList.appendChild(li);
                }
            });
        }

        // Add event listeners for real-time updates
        document.addEventListener('input', updatePreview);
        document.addEventListener('change', updatePreview);

        // Form submission
        document.getElementById('resumeForm').addEventListener('submit', function(event) {
            event.preventDefault();
            updatePreview();
            alert('Resume updated successfully! You can now download the PDF.');
        });

// Enhanced PDF download with professional styling and image support
        function downloadPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Generate unique filename with timestamp to prevent browser caching
            const timestamp = new Date().getTime();
            
            // Get data
            const name = document.getElementById('previewName').textContent;
            const jobTitle = document.getElementById('previewJobTitle').textContent;
            const email = document.getElementById('previewEmail').textContent;
            const phone = document.getElementById('previewPhone').textContent;
            const address = document.getElementById('previewAddress').textContent;
            const profile = document.getElementById('previewProfile').textContent;

            let y = 20;
            
            // Left column background
            doc.setFillColor(44, 62, 80);
            doc.rect(0, 0, 75, 297, 'F');
            
            // Add profile image or placeholder
            if (profileImageData) {
                doc.addImage(profileImageData, 'PNG', 25.5, 23, 24, 24, '', 'FAST');
            } else {
                // Profile circle placeholder
                doc.setFillColor(52, 73, 94);
                doc.circle(37.5, 35, 12, 'F');
                doc.setTextColor(189, 195, 199);
                doc.setFontSize(16);
                doc.text('👤', 35, 38);
            }
            
            // Left column content
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(name, 10, 60, { maxWidth: 55, align: 'left' });
            
            y = 75;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Contact', 10, y);
            y += 8;
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Address', 10, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.text(address, 10, y, { maxWidth: 55 });
            y += 12;
            
            doc.setFont('helvetica', 'bold');
            doc.text('Phone', 10, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.text(phone, 10, y, { maxWidth: 55 });
            y += 12;
            
            doc.setFont('helvetica', 'bold');
            doc.text('Email', 10, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.text(email, 10, y, { maxWidth: 55 });
            y += 15;
            
            // Skills
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Skills', 10, y);
            y += 8;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const skills = Array.from(document.querySelectorAll('#previewSkills li')).map(li => li.textContent);
            skills.forEach(skill => {
                doc.text(`• ${skill}`, 10, y);
                y += 6;
            });
            y += 5;
            
            // Languages
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Languages', 10, y);
            y += 8;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const languages = Array.from(document.querySelectorAll('#previewLanguages li')).map(li => li.textContent);
            languages.forEach(language => {
                doc.text(`• ${language}`, 10, y);
                y += 6;
            });
            y += 5;
            
            // Hobbies
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Hobbies', 10, y);
            y += 8;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const hobbies = Array.from(document.querySelectorAll('#previewHobbies li')).map(li => li.textContent);
            hobbies.forEach(hobby => {
                doc.text(`• ${hobby}`, 10, y);
                y += 6;
            });
            
            // Right column content
            doc.setTextColor(44, 62, 80);
            y = 30;
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text(name, 85, y);
            
            y += 8;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(52, 73, 94);
            doc.text(jobTitle, 85, y);
            
            y += 20;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(44, 62, 80);
            doc.text('Profile', 85, y);
            
            // Blue underline
            doc.setDrawColor(52, 152, 219);
            doc.setLineWidth(2);
            doc.line(85, y + 2, 120, y + 2);
            
            y += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(profile, 85, y, { maxWidth: 115 });
            y += doc.getTextDimensions(profile, { maxWidth: 115 }).h + 10;
            
            // Work Experience
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(44, 62, 80);
            doc.text('Work Experience', 85, y);
            doc.line(85, y + 2, 155, y + 2);
            y += 10;
            
            const experienceItems = document.querySelectorAll('#previewExperience .experience-item');
            experienceItems.forEach(item => {
                const title = item.querySelector('h4').textContent;
                const meta = item.querySelector('.experience-meta').textContent;
                const responsibilities = Array.from(item.querySelectorAll('ul li')).map(li => li.textContent);
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(44, 62, 80);
                doc.text(title, 85, y);
                y += 6;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(127, 140, 141);
                doc.text(meta, 85, y);
                y += 8;
                
                doc.setTextColor(44, 62, 80);
                responsibilities.forEach(resp => {
                    doc.text(`• ${resp}`, 90, y, { maxWidth: 110 });
                    y += doc.getTextDimensions(resp, { maxWidth: 110 }).h + 2;
                });
                y += 5;
            });
            
            // Education
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(44, 62, 80);
            doc.text('Education', 85, y);
            doc.line(85, y + 2, 130, y + 2);
            y += 10;
            
            const educationItems = document.querySelectorAll('#previewEducation .education-item');
            educationItems.forEach(item => {
                const title = item.querySelector('h4').textContent;
                const meta = item.querySelector('.education-meta').textContent;
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(44, 62, 80);
                doc.text(title, 85, y);
                y += 6;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(127, 140, 141);
                doc.text(meta, 85, y);
                y += 10;
            });
            
            // References
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(44, 62, 80);
            doc.text('References', 85, y);
            doc.line(85, y + 2, 140, y + 2);
            y += 10;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Available upon request', 85, y);
            
            doc.save(`${name.replace(/\s+/g, '_')}_Resume.pdf`);
        }
