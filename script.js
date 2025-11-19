function toggleSemesters(course) {
    var semesterContainer = document.getElementById("semesters");
    if (
        semesterContainer.style.display === "none" ||
        semesterContainer.style.display === ""
    ) {
        semesterContainer.style.display = "block";
    } else {
        semesterContainer.style.display = "none";
    }
}

// Intro animation - dots blend rapidly then form solid text
function setupIntroAnimation() {
    const overlay = document.getElementById('intro-overlay');
    const mainContent = document.getElementById('main-content');

    if (!overlay || !mainContent) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    overlay.appendChild(canvas);

    // Create text shape for particles to form
    const textCanvas = document.createElement('canvas');
    const textCtx = textCanvas.getContext('2d');
    textCanvas.width = canvas.width;
    textCanvas.height = canvas.height;
    
    // Draw text to get pixel data - increased size and moved up 10%
    const fontSize = Math.min(canvas.width * 0.25, 300);
    const verticalOffset = canvas.height * 0.4; // 10% higher than center (50% - 10% = 40%)
    textCtx.font = `bold italic ${fontSize}px Roboto, sans-serif`;
    textCtx.fillStyle = 'white';
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';
    textCtx.fillText('dumbAF', canvas.width / 2, verticalOffset);
    
    // Get pixels where text exists
    const imageData = textCtx.getImageData(0, 0, textCanvas.width, textCanvas.height);
    const textPixels = [];
    
    // Sample pixels from text (every pixel for maximum density)
    for (let y = 0; y < imageData.height; y += 1) {
        for (let x = 0; x < imageData.width; x += 1) {
            const index = (y * imageData.width + x) * 4;
            if (imageData.data[index + 3] > 128) { // If pixel is part of text
                textPixels.push({ x, y });
            }
        }
    }

    // Create particles with truly random distribution
    const particles = [];
    const particleCount = Math.min(textPixels.length, 5600); // Increased 40% more: 4000 * 1.4 = 5600
    
    for (let i = 0; i < particleCount; i++) {
        const targetPixel = textPixels[Math.floor(Math.random() * textPixels.length)];
        
        // Completely random starting positions across entire screen
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            targetX: targetPixel.x,
            targetY: targetPixel.y,
            size: Math.random() * 1 + 1, // Decreased from 1.5+1.5 to 1+1 (1-2px)
            speedX: (Math.random() - 0.5) * 25,
            speedY: (Math.random() - 0.5) * 25,
            angle: Math.random() * Math.PI * 2, // Random rotation angle
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            opacity: 0,
            startDelay: Math.random() * 0.15 // Stagger particle appearance
        });
    }

    const startTime = performance.now();
    const duration = 3000; // 3 seconds

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Phase timings:
        // 0-0.3s: Fade in particles
        // 0.3-1.5s: Fast chaotic blending
        // 1.5-3s: Form the text shape
        const fadeInPhase = Math.min(progress / 0.1, 1); // 0 to 1 in first 0.3s
        const blendPhase = Math.min(Math.max((progress - 0.1) / 0.4, 0), 1); // 0.3s to 1.5s
        const formPhase = Math.max(0, (progress - 0.5) / 0.5); // 1.5s to 3s
        
        particles.forEach((p, index) => {
            // Check if particle should be visible yet (staggered start)
            const particleStartProgress = Math.max(0, progress - (p.startDelay || 0));
            
            if (particleStartProgress < 0.5) {
                // Completely random chaotic motion - no wave patterns
                const motionIntensity = fadeInPhase * (1 - blendPhase * 0.3);
                
                // Add randomness to movement direction each frame
                const randomOffsetX = (Math.random() - 0.5) * 2;
                const randomOffsetY = (Math.random() - 0.5) * 2;
                
                // Update angle for spiral/random motion
                p.angle += p.rotationSpeed;
                
                // Combine original speed with random walk and rotation
                p.x += (p.speedX + randomOffsetX + Math.cos(p.angle) * 3) * motionIntensity;
                p.y += (p.speedY + randomOffsetY + Math.sin(p.angle) * 3) * motionIntensity;
                
                // Wrap around screen
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                
                // Smooth fade-in with random pulsing (not wave-based)
                const baseFadeIn = Math.min(particleStartProgress / 0.1, 1) * 0.3;
                const randomPulse = Math.sin(elapsed * 0.015 + index * 0.1) * 0.25;
                p.opacity = baseFadeIn + randomPulse * fadeInPhase;
            } else {
                // Smoothly move to form text shape
                const easeOut = 1 - Math.pow(1 - formPhase, 3);
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                
                p.x += dx * 0.12 * easeOut;
                p.y += dy * 0.12 * easeOut;
                
                // Increase opacity as they form text
                p.opacity = 0.4 + formPhase * 0.6;
            }

            // Draw particle only if it has started
            if (p.opacity > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 71, 90, ${p.opacity})`;
                ctx.fill();
            }
        });

        if (elapsed < duration) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete - multiple color flashes then transition to main content
            canvas.style.opacity = '0';
            
            // Create flash text element
            const flashText = document.createElement('div');
            flashText.style.position = 'absolute';
            flashText.style.top = '40%';
            flashText.style.left = '50%';
            flashText.style.transform = 'translate(-50%, -50%)';
            flashText.style.fontSize = Math.min(canvas.width * 0.25, 300) + 'px';
            flashText.style.fontWeight = 'bold';
            flashText.style.fontStyle = 'italic';
            flashText.style.fontFamily = 'Roboto, sans-serif';
            flashText.textContent = 'dumbAF';
            flashText.style.zIndex = '10000';
            overlay.appendChild(flashText);
            
            // Color sequence: brand green, white, black, brand green
            const colorFlashes = [
                { bg: 'rgb(0, 71, 90)', text: '#ffffff' },     // Brand green - white
                { bg: '#ffffff', text: '#000000' },             // White - black
                { bg: '#000000', text: '#ffffff' },             // Black - white
                { bg: 'rgb(0, 71, 90)', text: '#ffffff' }      // Brand green - white
            ];
            
            let flashIndex = 0;
            
            function showFlash() {
                if (flashIndex < colorFlashes.length) {
                    const flash = colorFlashes[flashIndex];
                    overlay.style.backgroundColor = flash.bg;
                    flashText.style.color = flash.text;
                    flashIndex++;
                    setTimeout(showFlash, 100); // 100ms per flash
                } else {
                    // All flashes done, transition to main content
                    overlay.classList.add('hidden');
                    mainContent.classList.add('visible');
                    setTimeout(() => {
                        canvas.remove();
                        flashText.remove();
                        overlay.style.backgroundColor = '#ffffff'; // Reset
                    }, 500);
                }
            }
            
            showFlash();
        }
    }

    requestAnimationFrame(animate);
}

let allNotices = [];
let filteredNotices = [];
let currentPage = 1;
let noticesPerPage = 25;

const CORS_PROXIES = [
    'https://cors.eu.org/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://proxy.cors.sh/',
    'https://api.allorigins.win/get?url='
];

let lastWorkingProxy = null;

const PTU_URLS = [
    { url: 'https://ptu.ac.in/noticeboard-main/', source: 'Main Board', defaultMax: 500 },
    { url: 'https://ptu.ac.in/main-campus-noticeboard/', source: 'Campus Board', defaultMax: 200 }
];

function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return new Date(0);
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return new Date(0);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
}

function formatDate(date) {
    if (!date || date.getTime() === 0) return 'Date not available';
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-IN', options);
}

function extractNotices(doc, source, defaultMaxNotices) {
    const notices = [];
    const loadAll = document.getElementById('loadAllToggle')?.checked;
    const maxNotices = loadAll ? Infinity : defaultMaxNotices;
    const tableSelectors = [
        'table tbody tr',
        '.notice-table tbody tr',
        '.table tbody tr',
        'tbody tr',
        '.content table tr',
        'table tr'
    ];
    let rows = [];
    for (const selector of tableSelectors) {
        rows = doc.querySelectorAll(selector);
        if (rows.length > 0) break;
    }
    const rowsToProcess = Math.min(rows.length, maxNotices);
    for (let i = 0; i < rowsToProcess; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) continue;
        let title = '', dateStr = '', pdfLink = '';
        if (cells.length >= 4) {
            title = cells[1]?.textContent?.trim() || '';
            dateStr = cells[2]?.textContent?.trim() || '';
            const linkElement = cells[3]?.querySelector('a');
            if (linkElement) {
                pdfLink = new URL(linkElement.getAttribute('href'), 'https://ptu.ac.in').href;
            }
        } else {
            title = cells[0]?.textContent?.trim() || '';
            dateStr = cells[1]?.textContent?.trim() || '';
            const linkElement = cells[2]?.querySelector('a');
            if (linkElement) {
                pdfLink = new URL(linkElement.getAttribute('href'), 'https://ptu.ac.in').href;
            }
        }
        title = title.replace(/^\d+\.?\s*/, '').trim();
        if (title && title.length > 10 && !title.toLowerCase().includes('title')) {
            notices.push({
                title: title,
                date: parseDate(dateStr),
                dateStr: dateStr || 'Not specified',
                pdfLink: pdfLink || '#',
                source: source
            });
        }
    }
    return notices;
}

async function fetchWithFallback(url) {
    let lastError;
    let proxiesToTry = [...CORS_PROXIES];
    if (lastWorkingProxy && proxiesToTry.includes(lastWorkingProxy)) {
        proxiesToTry = [lastWorkingProxy, ...proxiesToTry.filter(p => p !== lastWorkingProxy)];
    }
    for (let i = 0; i < proxiesToTry.length; i++) {
        const proxy = proxiesToTry[i];
        try {
            let proxyUrl;
            let fetchOptions = {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                signal: AbortSignal.timeout(10000)
            };
            if (proxy.includes('allorigins.win') || proxy.includes('codetabs')) {
                proxyUrl = proxy + encodeURIComponent(url);
            } else {
                proxyUrl = proxy + url;
            }
            const response = await fetch(proxyUrl, fetchOptions);
            if (response.ok) {
                lastWorkingProxy = proxy;
                if (proxy.includes('allorigins.win')) {
                    const data = await response.json();
                    if (data.contents && data.contents.length > 100) {
                        return new Response(data.contents, {
                            status: 200,
                            statusText: 'OK',
                            headers: { 'Content-Type': 'text/html' }
                        });
                    } else {
                        throw new Error('Empty or invalid response from allorigins');
                    }
                }
                return response;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('All proxy attempts failed');
}

async function fetchAllNotices() {
    const fetchPromises = PTU_URLS.map(async (sourceInfo) => {
        try {
            const response = await fetchWithFallback(sourceInfo.url);
            const htmlText = await response.text();
            if (htmlText.length < 100) {
                return [];
            }
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const notices = extractNotices(doc, sourceInfo.source, sourceInfo.defaultMax);
            return notices;
        } catch (error) {
            return [];
        }
    });
    const allResults = await Promise.all(fetchPromises);
    const results = allResults.flat();
    if (results.length === 0) {
        return [];
    }
    const uniqueNotices = results.filter((notice, index, self) => 
        index === self.findIndex(n => n.title === notice.title)
    );
    uniqueNotices.sort((a, b) => b.date.getTime() - a.date.getTime());
    return uniqueNotices;
}

function renderNoticesTable() {
    const tbody = document.getElementById('noticesTableBody');
    const startIndex = (currentPage - 1) * noticesPerPage;
    const endIndex = startIndex + noticesPerPage;
    const pageNotices = filteredNotices.slice(startIndex, endIndex);
    tbody.innerHTML = '';
    pageNotices.forEach((notice, index) => {
        const row = document.createElement('tr');
        const globalIndex = startIndex + index + 1;
        row.innerHTML = `
            <td>${globalIndex}</td>
            <td class="notice-title">${notice.title}</td>
            <td>${formatDate(notice.date)}</td>
            <td>
                ${notice.pdfLink ? 
                    `<a href="${notice.pdfLink}" target="_blank" class="download-link">Download</a>` : 
                    'Not available'
                }
            </td>
        `;
        tbody.appendChild(row);
    });
    updatePaginationControls();
    updateStatsDisplay();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(filteredNotices.length / noticesPerPage);
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function updateStatsDisplay() {
    const statsDisplay = document.getElementById('statsDisplay');
    const total = filteredNotices.length;
    const showing = Math.min(noticesPerPage, total - (currentPage - 1) * noticesPerPage);
    if (total === 0) {
        statsDisplay.textContent = 'No notices found';
    } else if (filteredNotices.length < allNotices.length) {
        statsDisplay.textContent = `Showing ${showing} of ${total} notices (filtered from ${allNotices.length} total)`;
    } else {
        statsDisplay.textContent = `Showing ${showing} of ${total} notices`;
    }
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredNotices.length / noticesPerPage);
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderNoticesTable();
    }
}

function filterNotices(searchTerm) {
    if (!searchTerm.trim()) {
        filteredNotices = [...allNotices];
    } else {
        const term = searchTerm.toLowerCase().trim();
        filteredNotices = allNotices.filter(notice => 
            notice.title.toLowerCase().includes(term)
        );
    }
    currentPage = 1;
    renderNoticesTable();
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (!errorContainer) return;
    errorContainer.innerHTML = `
        <div class="error">
            <h3>🚫 Error Loading Notices</h3>
            <p>${message}</p>
            <div class="error-solutions">
                <h4>Possible Solutions:</h4>
                <ul>
                    <li>Check your internet connection</li>
                    <li>Disable any ad blockers or VPN temporarily</li>
                    <li>Try refreshing the page in a few minutes</li>
                    <li>Try accessing from a different network</li>
                </ul>
                <button id="retryBtn" class="retry-btn">🔄 Retry</button>
            </div>
        </div>
    `;
    document.getElementById('retryBtn')?.addEventListener('click', refreshNotices);
}

async function refreshNotices() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn.disabled) return;
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 Loading...';
    await initializeNoticeboard();
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 Refresh';
}

function setupAutoRefresh() {
    setInterval(async () => {
        try {
            const newNotices = await fetchAllNotices();
            if (newNotices.length !== allNotices.length) {
                allNotices = newNotices;
                filteredNotices = [...allNotices];
                renderNoticesTable();
                const statsDisplay = document.getElementById('statsDisplay');
                if (statsDisplay) {
                    const originalColor = statsDisplay.style.color;
                    statsDisplay.style.color = 'blue';
                    statsDisplay.textContent = `📢 Updated! Found ${newNotices.length} notices`;
                    setTimeout(() => {
                        statsDisplay.style.color = originalColor;
                        updateStatsDisplay();
                    }, 5000);
                }
            }
        } catch (error) {
        }
    }, 600000);
}

async function initializeNoticeboard() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tableContainer = document.getElementById('tableContainer');
    const paginationContainer = document.getElementById('paginationContainer');
    const errorContainer = document.getElementById('errorContainer');
    try {
        if (errorContainer) errorContainer.innerHTML = '';
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.classList.remove('hidden');
        }
        if (tableContainer) {
            tableContainer.style.display = 'none';
            tableContainer.classList.add('hidden');
        }
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
            paginationContainer.classList.add('hidden');
        }
        const loadingText = loadingIndicator?.querySelector('p');
        if (loadingText) {
            loadingText.textContent = 'Connecting to PTU servers... This may take a moment...';
        }
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout - PTU servers are taking too long to respond')), 20000)
        );
        allNotices = await Promise.race([fetchAllNotices(), timeoutPromise]);
        filteredNotices = [...allNotices];
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.classList.add('hidden');
        }
        if (tableContainer) {
            if (allNotices.length > 0) {
                tableContainer.style.display = 'block';
                tableContainer.classList.remove('hidden');
            } else {
                showError("Could not find any notices. The university website might be down or has changed its structure.");
            }
        }
        if (paginationContainer) {
            paginationContainer.style.display = 'flex';
            paginationContainer.classList.remove('hidden');
        }
        renderNoticesTable();
        const statsDisplay = document.getElementById('statsDisplay');
        if (statsDisplay) {
            const originalColor = statsDisplay.style.color;
            statsDisplay.classList.add('status-success');
            setTimeout(() => {
                statsDisplay.classList.remove('status-success');
                statsDisplay.style.color = originalColor;
            }, 3000);
        }
    } catch (error) {
        showError(error.message);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.classList.add('hidden');
        }
    }
}

function setupNoticeboard() {
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const loadAllToggle = document.getElementById('loadAllToggle');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterNotices(searchInput.value));
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshNotices);
    }
    if (loadAllToggle) {
        loadAllToggle.addEventListener('change', refreshNotices);
    }
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', () => {
            noticesPerPage = parseInt(pageSizeSelect.value, 10);
            currentPage = 1;
            renderNoticesTable();
        });
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => changePage(-1));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => changePage(1));
    }
    initializeNoticeboard();
    setupAutoRefresh();
}


// Page initialization
(function() {
    if (document.body.classList.contains('noticeboard-page')) {
        document.addEventListener('DOMContentLoaded', setupNoticeboard);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setupIntroAnimation();
            const main = document.getElementById('main-content');
            if (main) {
                // Keep main content hidden until intro completes; visibility handled in setupIntroAnimation
                main.classList.remove('visible');
            }
        });
    }
})();

function setupAutoRefresh() {
    setInterval(async () => {
        try {
            const newNotices = await fetchAllNotices();
            if (newNotices.length !== allNotices.length) {
                allNotices = newNotices;
                filteredNotices = [...allNotices];
                renderNoticesTable();
                
                const statsDisplay = document.getElementById('statsDisplay');
                if (statsDisplay) {
                    const originalColor = statsDisplay.style.color;
                    statsDisplay.style.color = 'blue';
                    statsDisplay.textContent = `📢 Updated! Found ${newNotices.length} notices`;
                    setTimeout(() => {
                        statsDisplay.style.color = originalColor;
                        updateStatsDisplay();
                    }, 5000);
                }
            }
        } catch (error) {
        }
    }, 600000);
}

async function initializeNoticeboard() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tableContainer = document.getElementById('tableContainer');
    const paginationContainer = document.getElementById('paginationContainer');
    const errorContainer = document.getElementById('errorContainer');
    
    try {
        if (errorContainer) errorContainer.innerHTML = '';

        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.classList.remove('hidden');
        }
        if (tableContainer) {
            tableContainer.style.display = 'none';
            tableContainer.classList.add('hidden');
        }
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
            paginationContainer.classList.add('hidden');
        }

        const loadingText = loadingIndicator?.querySelector('p');
        if (loadingText) {
            loadingText.textContent = 'Connecting to PTU servers... This may take a moment...';
        }

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout - PTU servers are taking too long to respond')), 20000)
        );

        allNotices = await Promise.race([fetchAllNotices(), timeoutPromise]);
        filteredNotices = [...allNotices];

        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.classList.add('hidden');
        }
        if (tableContainer) {
            if (allNotices.length > 0) {
                tableContainer.style.display = 'block';
                tableContainer.classList.remove('hidden');
            } else {
                showError("Could not find any notices. The university website might be down or has changed its structure.");
            }
        }
        if (paginationContainer) {
            paginationContainer.style.display = 'flex';
            paginationContainer.classList.remove('hidden');
        }

        renderNoticesTable();
        
        const statsDisplay = document.getElementById('statsDisplay');
        if (statsDisplay) {
            const originalColor = statsDisplay.style.color;
            statsDisplay.classList.add('status-success');
            setTimeout(() => {
                statsDisplay.classList.remove('status-success');
                statsDisplay.style.color = originalColor;
            }, 3000);
        }

    } catch (error) {
        showError(error.message);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.classList.add('hidden');
        }
    }
}

function setupNoticeboard() {
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const loadAllToggle = document.getElementById('loadAllToggle');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (searchInput) {
        searchInput.addEventListener('input', () => filterNotices(searchInput.value));
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshNotices);
    }
    if (loadAllToggle) {
        loadAllToggle.addEventListener('change', refreshNotices);
    }
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', () => {
            noticesPerPage = parseInt(pageSizeSelect.value, 10);
            currentPage = 1;
            renderNoticesTable();
        });
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => changePage(-1));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => changePage(1));
    }

    initializeNoticeboard();
    setupAutoRefresh();
}

(function() {
    if (document.body.classList.contains('noticeboard-page')) {
        document.addEventListener('DOMContentLoaded', setupNoticeboard);
    } else {
        console.log("On main page, noticeboard script not initialized.");
    }
})();

