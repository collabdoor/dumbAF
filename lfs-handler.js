/**
 * LFS File Handler - Renders LFS files in browser using online viewers
 * For files stored in Git LFS (pdf, doc, docx, ppt, pptx, xls, xlsx, zip, etc.)
 */

(function() {
    'use strict';

    // Configuration
    const GITHUB_USER = 'collabdoor';
    const GITHUB_REPO = 'dumbAF';
    const GITHUB_BRANCH = 'main';
    
    // LFS file extensions (from .gitattributes) - excluding .txt as it can be opened directly
    const LFS_EXTENSIONS = [
        '.pdf', '.docx', '.doc', '.ppt', '.pptx', 
        '.xlsx', '.xls', '.zip'
    ];

    // Viewer services configuration
    const VIEWERS = {
        // Google Docs Viewer - supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
        GOOGLE: 'https://docs.google.com/viewer?url=',
        // Microsoft Office Online Viewer - supports: DOC, DOCX, XLS, XLSX, PPT, PPTX
        OFFICE: 'https://view.officeapps.live.com/op/embed.aspx?src=',
    };

    // File types that work best with each viewer
    const VIEWER_MAP = {
        '.pdf': 'GOOGLE',      // Google Docs Viewer works great for PDFs
        '.doc': 'OFFICE',      // Office Viewer for Word docs
        '.docx': 'OFFICE',
        '.ppt': 'OFFICE',      // Office Viewer for PowerPoint
        '.pptx': 'OFFICE',
        '.xls': 'OFFICE',      // Office Viewer for Excel
        '.xlsx': 'OFFICE',
        '.zip': 'DOWNLOAD'     // ZIP files must be downloaded
    };

    /**
     * Check if a file path has an LFS extension
     */
    function isLFSFile(filePath) {
        const lowerPath = filePath.toLowerCase();
        return LFS_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
    }

    /**
     * Get file extension from path
     */
    function getFileExtension(filePath) {
        const lowerPath = filePath.toLowerCase();
        for (const ext of LFS_EXTENSIONS) {
            if (lowerPath.endsWith(ext)) {
                return ext;
            }
        }
        return null;
    }

    /**
     * Get appropriate viewer for file type
     */
    function getViewerForFile(extension) {
        return VIEWER_MAP[extension] || 'GOOGLE';
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
     * Create viewer URL for file
     */
    function createViewerUrl(lfsUrl, extension) {
        const viewer = getViewerForFile(extension);
        
        if (viewer === 'DOWNLOAD') {
            // For files that can't be viewed, return direct download URL
            return lfsUrl;
        }
        
        // Encode the LFS URL for the viewer
        const encodedUrl = encodeURIComponent(lfsUrl);
        
        if (viewer === 'GOOGLE') {
            return VIEWERS.GOOGLE + encodedUrl + '&embedded=true';
        } else if (viewer === 'OFFICE') {
            return VIEWERS.OFFICE + encodedUrl;
        }
        
        // Fallback to direct URL
        return lfsUrl;
    }

    /**
     * Create floating download button
     */
    function createDownloadButton(lfsUrl, fileName) {
        const button = document.createElement('a');
        button.href = lfsUrl;
        button.download = fileName;
        button.textContent = 'DOWNLOAD';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            padding: 10px 20px;
            background: #00ff00;
            color: #000;
            border: 3px solid #000;
            box-shadow: 5px 5px 0px #000;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            font-size: 14px;
            text-decoration: none;
            text-transform: uppercase;
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.1s;
        `;
        
        button.onmouseover = function() {
            this.style.transform = 'translate(2px, 2px)';
            this.style.boxShadow = '3px 3px 0px #000';
        };
        
        button.onmouseout = function() {
            this.style.transform = '';
            this.style.boxShadow = '5px 5px 0px #000';
        };
        
        button.onmousedown = function() {
            this.style.transform = 'translate(5px, 5px)';
            this.style.boxShadow = '0px 0px 0px #000';
        };
        
        button.onmouseup = function() {
            this.style.transform = 'translate(2px, 2px)';
            this.style.boxShadow = '3px 3px 0px #000';
        };
        
        return button;
    }

    /**
     * Get filename from path
     */
    function getFileName(filePath) {
        return filePath.split('/').pop() || 'document';
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
                
                // Get file extension
                const extension = getFileExtension(href);
                
                // Convert to LFS URL
                const lfsUrl = convertToLFSUrl(href, currentPagePath);
                
                // Get file name
                const fileName = getFileName(href);
                
                // For ZIP files, download directly
                if (extension === '.zip') {
                    window.open(lfsUrl, '_blank', 'noopener,noreferrer');
                    return;
                }
                
                // Determine file type for viewer
                const fileType = extension === '.pdf' ? 'pdf' : 'office';
                
                // Build viewer URL with parameters
                const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                const viewerUrl = baseUrl + '/../../viewer.html?url=' + encodeURIComponent(lfsUrl) + 
                                 '&name=' + encodeURIComponent(fileName) + 
                                 '&type=' + fileType;
                
                // Open in new tab
                window.open(viewerUrl, '_blank', 'noopener,noreferrer');
            }
        });

        console.log('✓ LFS File Handler initialized - Files will open in custom viewer with download button');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLFSHandler);
    } else {
        initLFSHandler();
    }
})();
