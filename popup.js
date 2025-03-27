// State management
let bookmarks = [];
let categories = [];
let isDarkMode = false;

// DOM Elements
const searchBar = document.getElementById('searchBar');
const categoriesList = document.getElementById('categoriesList');
const bookmarksList = document.getElementById('bookmarksList');
const addCategoryBtn = document.getElementById('addCategory');
const toggleThemeBtn = document.getElementById('toggleTheme');

// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
    await loadBookmarks();
    await loadCategories();
    setupEventListeners();
    initializeDragAndDrop();
    loadThemePreference();
});

// Load bookmarks from Chrome
async function loadBookmarks() {
    chrome.bookmarks.getTree(async (bookmarkTreeNodes) => {
        bookmarks = await flattenBookmarks(bookmarkTreeNodes);
        renderBookmarks();
    });
}

// Flatten bookmark tree into array
function flattenBookmarks(bookmarkNodes) {
    let bookmarksList = [];
    
    function traverse(nodes) {
        for (const node of nodes) {
            if (node.url) {
                bookmarksList.push({
                    id: node.id,
                    title: node.title,
                    url: node.url,
                    category: 'Uncategorized',
                    tags: [],
                    notes: ''
                });
            }
            if (node.children) {
                traverse(node.children);
            }
        }
    }
    
    traverse(bookmarkNodes);
    return bookmarksList;
}

// Load categories from storage
async function loadCategories() {
    chrome.storage.sync.get(['categories'], (result) => {
        categories = result.categories || ['Uncategorized'];
        renderCategories();
    });
}

// Render bookmarks
function renderBookmarks(filteredBookmarks = bookmarks) {
    bookmarksList.innerHTML = '';
    
    filteredBookmarks.forEach(bookmark => {
        const bookmarkElement = createBookmarkElement(bookmark);
        bookmarksList.appendChild(bookmarkElement);
    });
}

// Create bookmark element
function createBookmarkElement(bookmark) {
    const div = document.createElement('div');
    div.className = 'p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow';
    div.draggable = true;
    div.dataset.id = bookmark.id;
    
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <a href="${bookmark.url}" class="text-blue-600 dark:text-blue-400 hover:underline">${bookmark.title}</a>
                <p class="text-sm text-gray-500 dark:text-gray-400">${bookmark.category}</p>
            </div>
            <div class="flex space-x-2">
                <button class="edit-btn text-gray-500 hover:text-gray-700">Edit</button>
                <button class="delete-btn text-red-500 hover:text-red-700">Delete</button>
            </div>
        </div>
    `;
    
    return div;
}

// Initialize drag and drop
function initializeDragAndDrop() {
    new Sortable(bookmarksList, {
        animation: 150,
        onEnd: async (evt) => {
            const bookmarkId = evt.item.dataset.id;
            const newIndex = evt.newIndex;
            
            // Update bookmark order in storage
            await updateBookmarkOrder(bookmarkId, newIndex);
        }
    });
}

// Search functionality
searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredBookmarks = bookmarks.filter(bookmark => 
        bookmark.title.toLowerCase().includes(searchTerm) ||
        bookmark.url.toLowerCase().includes(searchTerm) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
    renderBookmarks(filteredBookmarks);
});

// Theme toggle
function loadThemePreference() {
    chrome.storage.sync.get(['darkMode'], (result) => {
        isDarkMode = result.darkMode || false;
        updateTheme();
    });
}

function updateTheme() {
    document.body.classList.toggle('dark', isDarkMode);
    // Update theme icon
    toggleThemeBtn.innerHTML = isDarkMode ? 
        '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>' :
        '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>';
}

toggleThemeBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    chrome.storage.sync.set({ darkMode: isDarkMode });
    updateTheme();
});