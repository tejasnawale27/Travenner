// Admin Panel JavaScript

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

let packages = [];
let users = [];
let bookings = [];
let activeSection = 'packageSection';
let selectedPackage = null;

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('loginScreen').style.display = 'none';
            document.querySelector('.container').style.display = 'flex';
            showNotification('Welcome to Admin Panel', 'success');
            loadInitialData();
        } else {
            loginError.style.display = 'block';
            setTimeout(() => {
                loginError.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'An error occurred. Please try again.';
        loginError.style.display = 'block';
    }
    return false;
}

// Load initial data
async function loadInitialData() {
    try {
        const [packagesRes, usersRes, bookingsRes] = await Promise.all([
            fetch('/api/packages'),
            fetch('/api/users'),
            fetch('/api/bookings')
        ]);

        packages = await packagesRes.json();
        users = await usersRes.json();
        bookings = await bookingsRes.json();

        showPackages();
        showUsers();
        showBookings();
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data', 'error');
    }
}

// Show the specified section with animation
function showSection(sectionId) {
    document.getElementById(activeSection).style.opacity = '0';
    setTimeout(() => {
        document.getElementById(activeSection).style.display = 'none';
        document.getElementById(sectionId).style.display = 'block';
        void document.getElementById(sectionId).offsetHeight;
        document.getElementById(sectionId).style.opacity = '1';
        activeSection = sectionId;
    }, 300);

    document.querySelectorAll('.sidebar a').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');
}

// Package Management Functions
async function savePackage() {
    const formData = new FormData();
    const imageFiles = document.getElementById('images').files;
    
    // Add form fields to FormData
    formData.append('packageName', document.getElementById('packageName').value);
    formData.append('location', document.getElementById('location').value);
    formData.append('price', document.getElementById('packagePrice').value);
    formData.append('overview', document.getElementById('overview').value);
    formData.append('departureCity', document.getElementById('departureCity').value);
    formData.append('arrivalCity', document.getElementById('arrivalCity').value);
    formData.append('tripType', document.getElementById('tripType').value);
    formData.append('itinerary', document.getElementById('itinerary').value);

    // Add images to FormData
    for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
    }

    try {
        const url = selectedPackage 
            ? `/api/packages/${selectedPackage._id}`
            : '/api/packages';
        
        const method = selectedPackage ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            showNotification(`Package ${selectedPackage ? 'updated' : 'added'} successfully`, 'success');
            loadInitialData();
            cancelForm('packageSection');
        } else {
            throw new Error('Failed to save package');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error saving package', 'error');
    }
}

// Add the rest of your JavaScript functions here
// ... (copy all the remaining functions from your HTML file)

// Initialize the page
window.onload = function() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.querySelector('.container').style.display = 'none';
    
    // Add event listeners
    document.getElementById('images').addEventListener('change', handleImageUpload);
    
    // Check if user is already logged in
    checkAuthStatus();
};

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/admin/check-auth');
        if (response.ok) {
            document.getElementById('loginScreen').style.display = 'none';
            document.querySelector('.container').style.display = 'flex';
            loadInitialData();
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
} 