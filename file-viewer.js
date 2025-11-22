/**
 * File Viewer Utility - Renders Office files in browser instead of downloading
 * Supports: .doc, .docx, .ppt, .pptx, .pdf, .txt
 */

(function() {
    'use strict';
    
    // Base URL for your GitHub Pages site
    const GITHUB_PAGES_BASE = 'https://collabdoor.github.io/dumbAF/';
    
    // Office Online Viewer URL
    const OFFICE_VIEWER_URL = 'https://view.officeapps.live.com/op/view.aspx?src=';
    
    // File extensions that should be rendered in Office Viewer
    const OFFICE_EXTENSIONS = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
    
    /**
     * Get the file extension from a URL
     */
    function getFileExtension(url) {
        const pathname = url.split('?')[0];
        const parts = pathname.split('.');
        return parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : '';
    }
    
    /**
     * Convert relative path to absolute GitHub Pages URL
     */
    function getAbsoluteURL(relativeURL) {
        // If already absolute, return as-is
        if (relativeURL.startsWith('http://') || relativeURL.startsWith('https://')) {
            return relativeURL;
        }
        
        // Get current page path relative to root
        const currentPath = window.location.pathname.replace('/dumbAF/', '');
        const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
        
        // Resolve relative path
        let absolutePath = relativeURL;
        if (relativeURL.startsWith('../../')) {
            // Go up two levels from current directory
            const parts = currentDir.split('/').filter(p => p);
            parts.pop(); // Remove current folder
            parts.pop(); // Remove parent folder
            absolutePath = parts.join('/') + '/' + relativeURL.replace('../../', '');
        } else if (relativeURL.startsWith('../')) {
            // Go up one level
            const parts = currentDir.split('/').filter(p => p);
            parts.pop(); // Remove current folder
            absolutePath = parts.join('/') + '/' + relativeURL.replace('../', '');
        }
        
        // Encode special characters in filename while preserving path structure
        const pathParts = absolutePath.split('/');
        const encodedParts = pathParts.map((part, index) => {
            // Don't encode the path separators
            if (index === pathParts.length - 1) {
                // Only encode the filename
                return encodeURIComponent(part).replace(/%2F/g, '/');
            }
            return part;
        });
        
        return GITHUB_PAGES_BASE + encodedParts.join('/');
    }
    
    /**
     * Check if file should be viewed in Office Viewer
     */
    function shouldUseOfficeViewer(url) {
        const ext = getFileExtension(url);
        return OFFICE_EXTENSIONS.includes(ext);
    }
    
    /**
     * Open file in appropriate viewer
     */
    function openFileViewer(e, link) {
        const href = link.getAttribute('href');
        
        if (!href) return;
        
        const ext = getFileExtension(href);
        
        // Check if it's an Office file
        if (shouldUseOfficeViewer(href)) {
            e.preventDefault();
            
            // Get absolute URL
            const absoluteURL = getAbsoluteURL(href);
            
            // Open in Office Online Viewer
            const viewerURL = OFFICE_VIEWER_URL + encodeURIComponent(absoluteURL);
            window.open(viewerURL, '_blank');
            
            console.log('Opening in Office Viewer:', absoluteURL);
        }
        // PDF and TXT files open normally in new tab (default browser behavior)
        // No need to handle them specially
    }
    
    /**
     * Initialize file viewer for all file links
     */
    function initFileViewer() {
        // Find all links that point to files
        const fileLinks = document.querySelectorAll('a[href*=".doc"], a[href*=".ppt"], a[href*=".xls"]');
        
        fileLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                openFileViewer(e, this);
            });
            
            // Add visual indicator for Office files
            const href = link.getAttribute('href');
            if (shouldUseOfficeViewer(href)) {
                // Add a small icon or class to indicate it will open in viewer
                link.style.position = 'relative';
                link.title = 'Click to view in browser (Office Online Viewer)';
            }
        });
        
        console.log(`Initialized file viewer for ${fileLinks.length} Office document links`);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFileViewer);
    } else {
        initFileViewer();
    }
})();
