// Listen for bookmark changes in Chrome
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    syncBookmarkToStorage(id, bookmark);
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    removeBookmarkFromStorage(id);
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
    updateBookmarkInStorage(id, changeInfo);
});

// Sync functions
async function syncBookmarkToStorage(id, bookmark) {
    const bookmarkData = {
        id: id,
        title: bookmark.title,
        url: bookmark.url,
        category: 'Uncategorized',
        tags: [],
        notes: ''
    };

    // Get existing bookmarks
    chrome.storage.sync.get(['bookmarks'], (result) => {
        const bookmarks = result.bookmarks || [];
        bookmarks.push(bookmarkData);
        chrome.storage.sync.set({ bookmarks: bookmarks });
    });
}

async function removeBookmarkFromStorage(id) {
    chrome.storage.sync.get(['bookmarks'], (result) => {
        const bookmarks = result.bookmarks || [];
        const updatedBookmarks = bookmarks.filter(b => b.id !== id);
        chrome.storage.sync.set({ bookmarks: updatedBookmarks });
    });
}

async function updateBookmarkInStorage(id, changeInfo) {
    chrome.storage.sync.get(['bookmarks'], (result) => {
        const bookmarks = result.bookmarks || [];
        const bookmarkIndex = bookmarks.findIndex(b => b.id === id);
        
        if (bookmarkIndex !== -1) {
            bookmarks[bookmarkIndex] = {
                ...bookmarks[bookmarkIndex],
                ...changeInfo
            };
            chrome.storage.sync.set({ bookmarks: bookmarks });
        }
    });
}

// Check for duplicate bookmarks
async function findDuplicateBookmarks() {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        const bookmarks = flattenBookmarks(bookmarkTreeNodes);
        const duplicates = findDuplicates(bookmarks);
        
        if (duplicates.length > 0) {
            chrome.storage.sync.set({ duplicateBookmarks: duplicates });
            // Notify user about duplicates
            chrome.runtime.sendMessage({ 
                type: 'DUPLICATES_FOUND',
                duplicates: duplicates 
            });
        }
    });
}

function findDuplicates(bookmarks) {
    const urlMap = new Map();
    const duplicates = [];

    bookmarks.forEach(bookmark => {
        if (urlMap.has(bookmark.url)) {
            duplicates.push({
                url: bookmark.url,
                instances: [
                    urlMap.get(bookmark.url),
                    bookmark
                ]
            });
        } else {
            urlMap.set(bookmark.url, bookmark);
        }
    });

    return duplicates;
}

function flattenBookmarks(nodes) {
    let bookmarks = [];
    
    function traverse(nodes) {
        for (const node of nodes) {
            if (node.url) {
                bookmarks.push({
                    id: node.id,
                    title: node.title,
                    url: node.url
                });
            }
            if (node.children) {
                traverse(node.children);
            }
        }
    }
    
    traverse(nodes);
    return bookmarks;
}

// Run duplicate check periodically
setInterval(findDuplicateBookmarks, 1000 * 60 * 60); // Check every hour

// Export bookmarks
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EXPORT_BOOKMARKS') {
        chrome.storage.sync.get(['bookmarks'], (result) => {
            const bookmarks = result.bookmarks || [];
            const exportData = {
                bookmarks: bookmarks,
                categories: result.categories || [],
                exportDate: new Date().toISOString()
            };
            
            // Convert to JSON string
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Create download URL
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Trigger download
            chrome.downloads.download({
                url: url,
                filename: 'bookmarks-export.json'
            });
        });
    }
});