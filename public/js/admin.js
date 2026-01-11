// Add these functions to your existing JavaScript in admin-panel.ejs

// Save package with API call
async function savePackage(event) {
    event.preventDefault();

    const form = document.getElementById('packageForm');
    const formData = new FormData(form);

    try {
        const response = selectedPackage 
            ? await fetch(`/api/packages/${selectedPackage._id}`, {
                method: 'PUT',
                body: formData
            })
            : await fetch('/api/packages', {
                method: 'POST',
                body: formData
            });

        if (response.ok) {
            const savedPackage = await response.json();
            if (selectedPackage) {
                showNotification('Package updated successfully', 'success');
            } else {
                showNotification('Package added successfully', 'success');
            }
            loadPackages();
            cancelForm('packageSection');
        } else {
            showNotification('Error saving package', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error saving package', 'error');
    }
}

// Load packages from API
async function loadPackages() {
    try {
        const response = await fetch('/api/packages');
        if (response.ok) {
            packages = await response.json();
            showPackages();
        } else {
            showNotification('Error loading packages', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error loading packages', 'error');
    }
}

// Delete package with API call
async function deletePackage(id) {
    try {
        const response = await fetch(`/api/packages/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            showNotification('Package deleted successfully', 'success');
            loadPackages();
        } else {
            showNotification('Error deleting package', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error deleting package', 'error');
    }
}

document.getElementById('packageForm').addEventListener('submit', savePackage); 