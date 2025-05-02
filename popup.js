/**
 * Normalizes a bottle name for comparison by converting to lowercase,
 * removing special characters and common descriptive terms, and standardizing whitespace.
 * (This function is duplicated from background.js and content.js - consider consolidating later).
 * @param {string} name - The raw bottle name.
 * @returns {string} The normalized bottle name.
 */
function normalizeBottleName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\b(the|limited|edition|release|single|barrel|cask|strength|proof|year|old|aged|distillery|winery|vineyard|chateau|domaine)\b/g, '') // Remove common terms
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}
// Popup script for Honey Barrel extension

/**
 * Creates a DOM element representing a single matching bottle found on BAXUS.
 * Includes the bottle image (if available), name, type, price comparison,
 * savings message (if applicable), and a link to the BAXUS listing.
 * @param {object} match - The match object from the BAXUS API results (contains id, name, price, imageUrl, spiritType, etc.).
 * @param {number} currentPrice - The numeric price of the bottle detected on the current website.
 * @returns {HTMLElement} The created div element for the match item.
 */
function createMatchItem(match, currentPrice) {
    const matchItem = document.createElement('div');
    matchItem.className = 'match-item'; // Main container for the match card

    // --- Header: Image and Details ---
    const headerDiv = document.createElement('div');
    headerDiv.className = 'match-header';

    // Image (with fallback)
    if (match.imageUrl) {
      const img = document.createElement('img');
      img.className = 'match-image';
      img.src = match.imageUrl;
      img.alt = match.name; // Alt text for accessibility
      img.onerror = function() { // Handle broken images
        this.onerror = null; // Prevent infinite loop if fallback also fails
        this.src = 'images/bottle-placeholder.png'; // Path to a local fallback image
      };
      headerDiv.appendChild(img);
    }

    // Text Details (Name, Type)
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'match-details';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'match-name';
    nameDiv.textContent = match.name;
    detailsDiv.appendChild(nameDiv);

    if (match.spiritType) { // Only add type if it exists
      const typeDiv = document.createElement('div');
      typeDiv.className = 'match-type';
      typeDiv.textContent = match.spiritType;
      detailsDiv.appendChild(typeDiv);
    }

    headerDiv.appendChild(detailsDiv);
    matchItem.appendChild(headerDiv);

    // --- Price Comparison ---
    const priceCompareDiv = document.createElement('div');
    priceCompareDiv.className = 'price-compare';

    // Current Site Price
    const currentPriceDiv = document.createElement('div');
    currentPriceDiv.className = 'price-compare-item';
    currentPriceDiv.innerHTML = `
      <div class="price-label">Current Site</div>
      <div class="price-value">$${currentPrice.toFixed(2)}</div>
    `;
    priceCompareDiv.appendChild(currentPriceDiv);

    // BAXUS Price
    const baxusPriceDiv = document.createElement('div');
    baxusPriceDiv.className = 'price-compare-item';
    baxusPriceDiv.innerHTML = `
      <div class="price-label">on BAXUS</div>
      <div class="price-value">$${match.price.toFixed(2)}</div>
    `;
    priceCompareDiv.appendChild(baxusPriceDiv);

    matchItem.appendChild(priceCompareDiv);

    // --- Savings Message (Conditional) ---
    const priceDiff = currentPrice - match.price;
    // Only show the savings message if the price on BAXUS is lower
    if (priceDiff > 0.01) { // Use a small threshold for float comparison
      const savingsDiv = document.createElement('div');
      savingsDiv.className = 'savings';
      savingsDiv.innerHTML = `Save $${priceDiff.toFixed(2)} on BAXUS!`;
      matchItem.appendChild(savingsDiv); // Insert savings message
    }

    // --- Link Button ---
    const viewBtn = document.createElement('a');
    viewBtn.href = `https://baxus.co/asset/${match.id}`; // Link to the specific BAXUS asset page
    viewBtn.className = 'view-btn';
    viewBtn.target = '_blank'; // Open in new tab
    viewBtn.rel = 'noopener noreferrer'; // Security best practice
    viewBtn.innerHTML = `View on BAXUS <span>→</span>`; // Include arrow via span (styled in CSS)
    matchItem.appendChild(viewBtn); // Append the button at the end

    return matchItem;
}

/**
 * Clears the matches container and displays a message indicating that no matches were found.
 */
function showNoMatches() {
    const matchesContainer = document.querySelector('.matches');
    if (!matchesContainer) return; // Guard against missing element

    // Set the inner HTML to the "no matches" message structure.
    matchesContainer.innerHTML = `
      <div class="no-matches">
        <p>No matching bottles found on BAXUS marketplace</p>
      </div>
    `;
    // Note: The visual styling for this state is handled in popup.css
}

/**
 * Updates the status message displayed at the top of the popup and controls the visibility
 * of the loading indicator and the matches container based on the current state.
 * @param {string} message - The status message to display.
 * @param {'loading'|'success'|'error'|'no_matches'} [type='loading'] - The type of status, used for styling and controlling UI elements.
 */
function updateStatus(message, type = 'loading') {
    const statusElement = document.querySelector('.status');
    const loadingContainer = document.querySelector('.loading-container');
    const matchesContainer = document.querySelector('.matches');

    // Ensure elements exist before manipulating them
    if (!statusElement || !loadingContainer || !matchesContainer) {
        console.error("Popup UI elements missing (status, loading, or matches container).");
        return;
    }

    statusElement.textContent = message;
    // Apply class based on type for styling (e.g., status-loading, status-error)
    statusElement.className = `status status-${type}`;

    if (type === 'loading') {
        loadingContainer.style.display = 'block'; // Show loading animation
        matchesContainer.style.display = 'none';  // Hide matches area
    } else {
        loadingContainer.style.display = 'none';  // Hide loading animation
        matchesContainer.style.display = 'block'; // Show matches area (even if it's to display the "no matches" message)
        // Special case: Use error styling for the 'no_matches' status message itself
        if (type === 'no_matches') {
            statusElement.className = `status status-error`;
        }
    }
}

/**
 * Clears the existing matches display and populates it with new match items.
 * If no matches are provided, it updates the status and shows the "no matches" message.
 * @param {Array<object>|null} matches - An array of match objects from the BAXUS search, or null/empty if none found.
 * @param {number} currentPrice - The numeric price from the current page, needed by `createMatchItem`.
 */
function updatePopupContent(matches, currentPrice) {
    const matchesContainer = document.querySelector('.matches');
    if (!matchesContainer) return; // Guard clause

    matchesContainer.innerHTML = ''; // Clear previous content (matches or "no matches" message)

    if (!matches || matches.length === 0) {
        // If no matches, update status and show the specific "no matches" UI
        updateStatus('No matches found on BAXUS.', 'no_matches');
        showNoMatches();
        return; // Stop further processing
    }

    // If matches exist, update status to success
    updateStatus(`Found ${matches.length} matching bottle${matches.length > 1 ? 's' : ''}`, 'success');

    // Create and append each match item element.
    // A small timeout introduces a subtle stagger effect for visual appeal.
    matches.forEach((match, index) => {
        setTimeout(() => {
            // Ensure matchesContainer still exists in case of rapid changes
            if (document.querySelector('.matches')) {
                matchesContainer.appendChild(createMatchItem(match, currentPrice));
            }
        }, index * 50); // Reduced delay slightly
    });
}

/**
 * Handles various error conditions by logging the error, updating the popup status
 * to display a user-friendly error message, and showing the "no matches" UI state.
 * @param {string|null} message - The specific error message, if available.
 * @param {'general'|'tab_access'|'info_fetch'|'no_info'|'search_fail'|'invalid_name'} [errorType='general'] - A code indicating the type of error.
 */
function handleError(message, errorType = 'general') {
    let displayMessage = 'An error occurred.'; // Default message

    // Determine a more specific user-facing message based on the error type
    if (message) {
        // If a specific message is provided, use it (potentially from runtime.lastError)
        displayMessage = message;
    } else {
        // Otherwise, use a predefined message based on the error type code
        switch (errorType) {
            case 'tab_access':
                displayMessage = 'Error: Could not access the current tab.';
                break;
            case 'info_fetch':
                displayMessage = 'Error: Failed to get page information.';
                break;
            case 'no_info':
                displayMessage = 'Error: No bottle information detected on this page.';
                break;
            case 'search_fail':
                displayMessage = 'Error: Failed to search for matches.';
                break;
            case 'invalid_name':
                displayMessage = 'Error: Could not determine a valid name for search.';
                break;
            // Keep 'general' using the default "An error occurred."
        }
    }

    // Log the detailed error to the console for debugging
    console.error(`Honey Barrel Popup Error (${errorType}):`, message || displayMessage);

    // Update the popup UI to show the error status and the "no matches" state
    updateStatus(displayMessage, 'error');
    showNoMatches(); // Visually indicates failure
}

/**
 * Main execution block for the popup. Runs when the popup HTML is fully loaded.
 * 1. Sets the initial loading state.
 * 2. Queries for the active tab.
 * 3. Sends a message to the background script to get the latest bottle info for that tab.
 * 4. If valid info is received, normalizes the name and sends another message to the background
 *    script to search for matches on BAXUS.
 * 5. Processes the search results (or errors) and updates the popup UI accordingly.
 */
document.addEventListener('DOMContentLoaded', function() {
    // console.log("Popup opened"); // Debug log removed
    updateStatus('Checking current page...', 'loading'); // Set initial UI state

    // Get the currently active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const activeTab = tabs[0];

        // Handle cases where the tab cannot be accessed
        if (!activeTab || !activeTab.id) {
            console.error("Cannot access current tab or tab ID");
            handleError('Cannot access current tab or tab ID', 'tab_access');
            return;
        }
        // console.log("Active tab:", activeTab.url); // Debug log removed

        // --- Step 1: Get Latest Bottle Info from Background ---
        // console.log(`Requesting latest info for tab ${activeTab.id} from background script...`); // Debug log removed
        chrome.runtime.sendMessage({ type: 'GET_LATEST_BOTTLE_INFO', tabId: activeTab.id }, response => {
            // Check for communication errors
            if (chrome.runtime.lastError) {
                console.error("Error requesting info from background:", chrome.runtime.lastError.message);
                handleError(`Failed to communicate with background script: ${chrome.runtime.lastError.message}`, 'info_fetch');
                return;
            }

            // console.log("Response from background script (GET_LATEST_BOTTLE_INFO):", response); // Debug log removed

            // Validate the response and the essential data needed
            if (!response || !response.bottleInfo || !response.bottleInfo.name || !response.bottleInfo.priceInfo || typeof response.bottleInfo.priceInfo.value !== 'number') {
                console.warn("No valid bottle info received from background script.");
                handleError('No bottle detected or info not ready yet.', 'no_info'); // Show specific error
                return;
            }

            // Extract necessary info for the search
            const { name: bottleName, priceInfo } = response.bottleInfo;
            const currentPrice = priceInfo.value; // The numeric price from the current page

            // --- Step 2: Normalize Name and Initiate Search ---
            // console.log(`Raw bottleName from background script: "${bottleName}"`); // Debug log removed
            const normalizedBottleName = normalizeBottleName(bottleName);
            // console.log(`Normalized name for search: "${normalizedBottleName}"`); // Debug log removed

            // Ensure the normalized name is usable for searching
            if (!normalizedBottleName) {
                console.warn("Normalized bottle name is empty. Aborting search.");
                handleError("Could not determine a valid name for search.", 'invalid_name');
                return;
            }

            // Update UI to show searching status
            updateStatus(`Searching BAXUS for: ${bottleName}`, 'loading');

            // Send message to background script to perform the search
            chrome.runtime.sendMessage(
                { type: 'SEARCH_BOTTLE', normalizedName: normalizedBottleName, tabId: activeTab.id },
                searchResponse => {
                    // Check for communication errors during search
                    if (chrome.runtime.lastError) {
                        console.error("Error sending/receiving SEARCH_BOTTLE:", chrome.runtime.lastError.message);
                        handleError(`Error during BAXUS search: ${chrome.runtime.lastError.message}`, 'search_fail');
                        return;
                    }

                    // console.log("Search response:", searchResponse); // Debug log removed

                    // Validate the search response structure
                    if (!searchResponse) {
                        handleError('Received invalid response from search.', 'search_fail');
                        return;
                    }

                    // --- Step 3: Process Search Results ---
                    if (searchResponse.error) {
                        // Handle errors reported explicitly by the background script's search
                        handleError(`Search error: ${searchResponse.error}`, 'search_fail');
                    } else if (searchResponse.matches) {
                        // Success! Update the popup UI with the matches found
                        updatePopupContent(searchResponse.matches, currentPrice);
                    } else {
                        // Handle unexpected response format (missing matches without an error)
                        handleError('Unexpected search result format.', 'search_fail');
                    }
                }
            );
        });
    });
});