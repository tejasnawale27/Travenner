// Language handling functions
function toggleDropdown() {
    const dropdown = document.getElementById("langDropdown");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function selectLanguage(langCode, langText) {
    // Update displayed language
    document.getElementById("selected-lang").textContent = langText;
    
    // Store language preference
    localStorage.setItem('selectedLanguage', langCode);
    localStorage.setItem('selectedLanguageText', langText);
    
    // Update Google Translate
    const translateSelect = document.querySelector(".goog-te-combo");
    if (translateSelect) {
        translateSelect.value = langCode;
        translateSelect.dispatchEvent(new Event("change"));
    }

    // Close the dropdown
    document.getElementById("langDropdown").style.display = "none";

    // Adjust layout for Google Translate bar
    adjustLayout();
}

// Load Google Translate API
function loadGoogleTranslate() {
    if (!document.querySelector('script[src*="translate.google.com"]')) {
        const script = document.createElement("script");
        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateInit";
        document.body.appendChild(script);
    }
}

// Adjust layout when Google Translate bar appears
function adjustLayout() {
    const header = document.querySelector('.header');
    const navbar = document.querySelector('.navbar');
    const mainContent = document.querySelector('.main-content');
    const translateBar = document.querySelector('.goog-te-banner-frame');
    
    // Wait for the translate bar to be fully rendered
    setTimeout(() => {
        if (document.body.classList.contains('translated-ltr') || 
            document.body.classList.contains('translated-rtl')) {
            // Get actual translate bar height
            const translateBarHeight = translateBar ? translateBar.offsetHeight : 40;
            
            // When translated, adjust positions for the Google Translate bar
            header.style.top = translateBarHeight + 'px';
            navbar.style.top = (translateBarHeight + 60) + 'px';
            if (mainContent) {
                mainContent.style.marginTop = (translateBarHeight + 120) + 'px';
            }
        } else {
            // Reset positions when not translated
            header.style.top = '0';
            navbar.style.top = '60px';
            if (mainContent) {
                mainContent.style.marginTop = '120px';
            }
        }
    }, 100); // Reduced delay for faster response
}

// Setup observer for Google Translate bar
function setupTranslateObserver() {
    // Create observer to watch for changes to body classes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                adjustLayout();
            }
        });
    });

    // Watch for changes to body class
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });

    // Also watch for the Google Translate bar
    const translateObserver = new MutationObserver(() => {
        adjustLayout();
    });

    // Start observing once the translate element is added
    setTimeout(() => {
        const translateBar = document.querySelector('.goog-te-banner-frame');
        if (translateBar) {
            translateObserver.observe(translateBar, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }
    }, 1000);
}

// Initialize Google Translate
function googleTranslateInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,mr,hi,gu,ta,te,pa,bn',
        autoDisplay: false,
        layout: google.translate.TranslateElement.InlineLayout.TOP
    }, 'google_translate_element');
    
    // Apply stored language preference after a short delay
    setTimeout(() => {
        const storedLang = localStorage.getItem('selectedLanguage');
        const storedLangText = localStorage.getItem('selectedLanguageText');
        if (storedLang && storedLangText) {
            selectLanguage(storedLang, storedLangText);
        }
        setupTranslateObserver();
    }, 1000);
}

// Initialize translation on page load
document.addEventListener('DOMContentLoaded', () => {
    loadGoogleTranslate();
    
    // Update language display from stored preference
    const storedLangText = localStorage.getItem('selectedLanguageText');
    if (storedLangText) {
        document.getElementById("selected-lang").textContent = storedLangText;
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.lang-select')) {
            document.getElementById("langDropdown").style.display = "none";
        }
    });
});
