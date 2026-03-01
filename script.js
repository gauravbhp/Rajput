// script.js
let images = [];

// Load images from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    loadImages();
});

function loadImages() {
    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('imageGrid').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';

    // Get images from localStorage
    setTimeout(() => {
        const savedImages = localStorage.getItem('galleryImages');
        images = savedImages ? JSON.parse(savedImages) : [];
        
        // Update UI
        updateImageCount();
        
        if (images.length === 0) {
            showEmptyState();
        } else {
            displayImages();
        }
        
        // Hide loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';
    }, 800); // Simulated loading for smooth UX
}

function displayImages() {
    const grid = document.getElementById('imageGrid');
    grid.style.display = 'grid';
    grid.innerHTML = '';

    // Sort by date (newest first)
    images.sort((a, b) => new Date(b.date) - new Date(a.date));

    images.forEach((image, index) => {
        const card = createImageCard(image, index);
        grid.appendChild(card);
    });
}

function createImageCard(image, index) {
    const col = document.createElement('div');
    col.className = 'relative group';
    
    col.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div class="relative overflow-hidden h-56">
                <img src="${image.dataUrl}" 
                     alt="${image.title}"
                     class="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                     loading="lazy">
                
                <!-- Overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div class="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                        <a href="${image.dataUrl}" 
                           download="${image.title}.jpg"
                           class="bg-white text-gray-800 p-3 rounded-full hover:bg-blue-600 hover:text-white transition transform translate-y-2 group-hover:translate-y-0">
                            <i class="fas fa-download"></i>
                        </a>
                        <button onclick="deleteImage(${index})" 
                                class="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition transform translate-y-2 group-hover:translate-y-0">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="p-4">
                <h3 class="font-bold text-lg mb-1 text-gray-800">${image.title}</h3>
                ${image.description ? `<p class="text-gray-600 text-sm mb-2">${image.description}</p>` : ''}
                <div class="flex justify-between items-center">
                    <span class="text-gray-400 text-xs">
                        <i class="far fa-calendar-alt mr-1"></i>${formatDate(image.date)}
                    </span>
                    <span class="text-gray-400 text-xs">
                        <i class="far fa-eye mr-1"></i>${image.views || 0} views
                    </span>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays/7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function updateImageCount() {
    const countElement = document.getElementById('imageCount');
    if (countElement) {
        countElement.textContent = `${images.length} image${images.length !== 1 ? 's' : ''}`;
    }
}

function showEmptyState() {
    document.getElementById('imageGrid').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
}

function deleteImage(index) {
    if (confirm('Are you sure you want to delete this image?')) {
        images.splice(index, 1);
        localStorage.setItem('galleryImages', JSON.stringify(images));
        
        // Show success message
        showToast('Image deleted successfully!', 'error');
        
        // Reload gallery
        loadImages();
    }
}

function showToast(message, type = 'success') {
    // Create toast if not exists
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.className = 'fixed bottom-5 right-5 px-6 py-4 rounded-xl shadow-lg transform transition-transform duration-500 translate-y-20 z-50';
        document.body.appendChild(toast);
    }
    
    // Set style based on type
    toast.className = `fixed bottom-5 right-5 px-6 py-4 rounded-xl shadow-lg transform transition-transform duration-500 z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Show toast
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateY(20px)';
    }, 3000);
}

// Export functions for use in other files
window.deleteImage = deleteImage;