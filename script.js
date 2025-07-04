// Main page functionality
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

// Noticeboard functionality
// Global variables for pagination and data management
let allNotices = [];
let filteredNotices = [];
let currentPage = 1;
let noticesPerPage = 25;

// Better CORS proxy URLs that are more reliable - optimized order
const CORS_PROXIES = [
    'https://cors.eu.org/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://proxy.cors.sh/',
    'https://api.allorigins.win/get?url='
];

// Cache for successful proxy to speed up subsequent requests
let lastWorkingProxy = null;

// PTU notice board URLs
const PTU_URLS = [
    { url: 'https://ptu.ac.in/noticeboard-main/', source: 'Main Board', defaultMax: 500 },
    { url: 'https://ptu.ac.in/main-campus-noticeboard/', source: 'Campus Board', defaultMax: 200 }
];

/**
 * Utility function to parse date strings in DD/MM/YYYY format
 * @param {string} dateStr - Date string in DD/MM/YYYY format
 * @returns {Date} - JavaScript Date object
 */
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return new Date(0);
    
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return new Date(0);
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    const year = parseInt(parts[2], 10);
    
    return new Date(year, month, day);
}

/**
 * Format date object to readable string
 * @param {Date} date - JavaScript Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    if (!date || date.getTime() === 0) return 'Date not available';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-IN', options);
}

/**
 * Generic function to extract notices from a parsed HTML document.
 * @param {Document} doc - The parsed HTML document.
 * @param {string} source - The source of the notices (e.g., 'Main Board').
 * @param {number} defaultMaxNotices - The default maximum number of notices to extract.
 * @returns {Array} - An array of notice objects.
 */
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

        if (cells.length >= 4) { // S.No. | Title | Date | Download
            title = cells[1]?.textContent?.trim() || '';
            dateStr = cells[2]?.textContent?.trim() || '';
            const linkElement = cells[3]?.querySelector('a');
            if (linkElement) {
                pdfLink = new URL(linkElement.getAttribute('href'), 'https://ptu.ac.in').href;
            }
        } else { // Title | Date | Download
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
    console.log(`Extracted ${notices.length} notices from ${source} (processed ${rowsToProcess}/${rows.length} rows)`);
    return notices;
}

/**
 * Optimized fetch with faster proxy handling and caching
 * @param {string} url - The target URL to fetch
 * @returns {Promise<Response>} - Promise resolving to response
 */
async function fetchWithFallback(url) {
    let lastError;
    
    // Skip direct fetch as PTU blocks cross-origin requests
    console.log(`Fetching ${url} via CORS proxies...`);
    
    // Reorder proxies to try the last working one first
    let proxiesToTry = [...CORS_PROXIES];
    if (lastWorkingProxy && proxiesToTry.includes(lastWorkingProxy)) {
        proxiesToTry = [lastWorkingProxy, ...proxiesToTry.filter(p => p !== lastWorkingProxy)];
    }
    
    // Try each CORS proxy with faster timeouts
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
                signal: AbortSignal.timeout(10000) // 10 second timeout per proxy
            };
            
            if (proxy.includes('allorigins.win') || proxy.includes('codetabs')) {
                proxyUrl = proxy + encodeURIComponent(url);
            } else {
                proxyUrl = proxy + url;
            }
            
            console.log(`Trying proxy ${i + 1}/${proxiesToTry.length}: ${proxy.split(/[?\/]/)[2]}...`);
            
            const response = await fetch(proxyUrl, fetchOptions);
            
            if (response.ok) {
                console.log(`✓ Proxy ${i + 1} successful`);
                
                // Cache the working proxy for next time
                lastWorkingProxy = proxy;
                
                // Handle different proxy response formats
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
            console.log(`Proxy ${i + 1} failed:`, error.message);
            lastError = error;
            
            // No delay between proxy attempts for speed
        }
    }
    
    throw lastError || new Error('All proxy attempts failed');
}

/**
 * Optimized parallel fetch and parse notices from PTU websites 
 * @returns {Promise<Array>} - Promise resolving to array of all notices
 */
async function fetchAllNotices() {
    // Fetch URLs in parallel for speed, with individual error handling
    const fetchPromises = PTU_URLS.map(async (sourceInfo) => {
        try {
            console.log(`Starting fetch from: ${sourceInfo.url}`);
            
            const response = await fetchWithFallback(sourceInfo.url);
            const htmlText = await response.text();
            
            if (htmlText.length < 100) {
                console.warn(`Received very short response from ${sourceInfo.url}`);
                return [];
            }
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            
            const notices = extractNotices(doc, sourceInfo.source, sourceInfo.defaultMax);
            
            console.log(`Successfully extracted ${notices.length} notices from ${sourceInfo.url}`);
            return notices;
            
        } catch (error) {
            console.error(`Error fetching from ${sourceInfo.url}:`, error.message);
            return []; // Return empty array on error to continue with other URLs
        }
    });
    
    // Wait for all parallel fetches to complete and flatten results
    const allResults = await Promise.all(fetchPromises);
    const results = allResults.flat();

    // If no real data found, handle it
    if (results.length === 0) {
        console.log('No notices found from any PTU websites.');
        return [];
    }
    
    // Sort notices by date (newest first) and remove duplicates
    const uniqueNotices = results.filter((notice, index, self) => 
        index === self.findIndex(n => n.title === notice.title)
    );
    
    uniqueNotices.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    console.log(`Fetched and parsed ${uniqueNotices.length} unique notices`);
    return uniqueNotices;
}

/**
 * Render notices table for current page
 */
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

/**
 * Update pagination controls
 */
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredNotices.length / noticesPerPage);
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

/**
 * Update statistics display
 */
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

/**
 * Change page for pagination
 * @param {number} direction - Direction to change page (-1 for previous, 1 for next)
 */
function changePage(direction) {
    const totalPages = Math.ceil(filteredNotices.length / noticesPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderNoticesTable();
    }
}

/**
 * Filter notices based on search input
 * @param {string} searchTerm - Search term to filter by
 */
function filterNotices(searchTerm) {
    if (!searchTerm.trim()) {
        filteredNotices = [...allNotices];
    } else {
        const term = searchTerm.toLowerCase().trim();
        filteredNotices = allNotices.filter(notice => 
            notice.title.toLowerCase().includes(term)
        );
    }
    
    currentPage = 1; // Reset to first page
    renderNoticesTable();
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
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
    // Add event listener to the new retry button
    document.getElementById('retryBtn')?.addEventListener('click', refreshNotices);
}

/**
 * Refresh notices data, disabling the button during fetch
 */
async function refreshNotices() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn.disabled) return; // Prevent multiple clicks

    console.log('Refreshing notices...');
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 Loading...';
    
    await initializeNoticeboard();

    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 Refresh';
}

/**
 * Set up auto-refresh functionality
 */
function setupAutoRefresh() {
    // Auto-refresh every 10 minutes (600000 ms)
    setInterval(async () => {
        console.log('Auto-refreshing notices...');
        try {
            const newNotices = await fetchAllNotices();
            if (newNotices.length !== allNotices.length) {
                allNotices = newNotices;
                filteredNotices = [...allNotices];
                renderNoticesTable();
                
                // Show notification of update
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
            console.log('Auto-refresh failed:', error.message);
        }
    }, 600000); // 10 minutes
}

/**
 * Initialize the noticeboard with enhanced error handling
 */
async function initializeNoticeboard() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tableContainer = document.getElementById('tableContainer');
    const paginationContainer = document.getElementById('paginationContainer');
    const errorContainer = document.getElementById('errorContainer');
    
    try {
        // Clear previous errors
        if (errorContainer) errorContainer.innerHTML = '';

        // Show loading indicator
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

        // Update loading message with progress
        const loadingText = loadingIndicator?.querySelector('p');
        if (loadingText) {
            loadingText.textContent = 'Connecting to PTU servers... This may take a moment...';
        }

        // Add timeout to prevent infinite loading - reduced for faster feedback
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout - PTU servers are taking too long to respond')), 20000)
        );

        // Fetch notices with timeout
        allNotices = await Promise.race([fetchAllNotices(), timeoutPromise]);
        filteredNotices = [...allNotices];

        // Hide loading indicator and show table
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.classList.add('hidden');
        }
        if (tableContainer) {
            // Only show table if there are notices
            if (allNotices.length > 0) {
                tableContainer.style.display = 'block';
                tableContainer.classList.remove('hidden');
            } else {
                showError("Could not find any notices. The university website might be down or has changed its structure.");
            }
        }
        if (paginationContainer) {
            paginationContainer.style.display = 'flex'; // Use flex for proper alignment
            paginationContainer.classList.remove('hidden');
        }

        // Render the table
        renderNoticesTable();

        console.log(`✓ Noticeboard loaded with ${allNotices.length} notices`);
        
        // Show success message briefly with different colors for demo vs real data
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
        console.error('Initialization failed:', error);
        showError(error.message);
        // Hide loading indicator on error
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.classList.add('hidden');
        }
    }
}

/**
 * Main function to set up the noticeboard page
 */
function setupNoticeboard() {
    // DOM element references
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const loadAllToggle = document.getElementById('loadAllToggle');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Event Listeners
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

    // Initial load
    initializeNoticeboard();
    setupAutoRefresh();
}

// Self-invoking function to handle which setup to run based on the page
(function() {
    // Run noticeboard setup only on the noticeboard page
    if (document.body.classList.contains('noticeboard-page')) {
        // Use DOMContentLoaded to ensure all elements are available
        document.addEventListener('DOMContentLoaded', setupNoticeboard);
    } else {
        // You can add logic for other pages here if needed
        console.log("On main page, noticeboard script not initialized.");
    }
})();
