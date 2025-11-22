/**
 * LFS File Handler - Converts relative file paths to GitHub LFS download URLs
 * For files stored in Git LFS (pdf, doc, docx, ppt, pptx, xls, xlsx, zip, txt, etc.)
 */

(function() {
    'use strict';

    // Configuration
    const GITHUB_USER = 'collabdoor';
    const GITHUB_REPO = 'dumbAF';
    const GITHUB_BRANCH = 'main';
    
    // LFS file extensions (from .gitattributes)
    const LFS_EXTENSIONS = [
        '.pdf', '.docx', '.doc', '.ppt', '.pptx', 
        '.xlsx', '.xls', '.zip', '.txt'
    ];

    /**
     * Check if a file path has an LFS extension
     */
    function isLFSFile(filePath) {
        const lowerPath = filePath.toLowerCase();
        return LFS_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
    }

    /**
     * Convert relative path to absolute GitHub LFS URL
     */
    function convertToLFSUrl(relativePath, currentPagePath) {
        // Remove leading './' if present
        relativePath = relativePath.replace(/^\.\//, '');

        // Calculate the base path from current page location
        let basePath = '';
        
        // If path starts with '../', resolve it relative to current page
        if (relativePath.startsWith('../')) {
            const pathSegments = currentPagePath.split('/').filter(Boolean);
            const upLevels = (relativePath.match(/\.\.\//g) || []).length;
            
            // Remove filename and go up directories
            pathSegments.pop(); // remove current file
            for (let i = 0; i < upLevels; i++) {
                pathSegments.pop();
            }
            
            basePath = pathSegments.join('/');
            relativePath = relativePath.replace(/^(\.\.\/)+/, '');
        } else {
            // Get directory of current page
            const pathSegments = currentPagePath.split('/').filter(Boolean);
            pathSegments.pop(); // remove current file
            basePath = pathSegments.join('/');
        }

        // Combine base path with relative path
        const fullPath = basePath ? `${basePath}/${relativePath}` : relativePath;

        // Create GitHub media URL
        const encodedPath = fullPath.split('/').map(encodeURIComponent).join('/');
        return `https://media.githubusercontent.com/media/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${encodedPath}`;
    }

    /**
     * Get current page path relative to repository root
     */
    function getCurrentPagePath() {
        const fullPath = window.location.pathname;
        // Remove the repository name from path if present (for GitHub Pages)
        const repoPath = `/${GITHUB_REPO}/`;
        if (fullPath.includes(repoPath)) {
            return fullPath.split(repoPath)[1] || '';
        }
        // For local development or other hosting
        return fullPath.replace(/^\//, '');
    }

    /**
     * Initialize link interception for LFS files
     */
    function initLFSHandler() {
        // Get current page path
        const currentPagePath = getCurrentPagePath();

        // Intercept all clicks on links
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            
            if (!link) return;

            const href = link.getAttribute('href');
            
            // Check if this is a relative link to an LFS file
            if (href && !href.startsWith('http') && !href.startsWith('//') && isLFSFile(href)) {
                e.preventDefault();
                
                // Convert to LFS URL
                const lfsUrl = convertToLFSUrl(href, currentPagePath);
                
                // Open in new tab or download
                if (link.hasAttribute('target') && link.getAttribute('target') === '_blank') {
                    window.open(lfsUrl, '_blank', 'noopener,noreferrer');
                } else {
                    // Force download by opening in new window
                    window.open(lfsUrl, '_blank', 'noopener,noreferrer');
                }
            }
        });

        console.log('✓ LFS File Handler initialized - All document links will download from GitHub LFS');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLFSHandler);
    } else {
        initLFSHandler();
    }
})();
