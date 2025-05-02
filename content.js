/**
 * Normalizes a bottle name for comparison by converting to lowercase,
 * removing special characters and common descriptive terms, and standardizing whitespace.
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

/**
 * Debounce function to limit how often a function is called.
 * Useful for event listeners that fire frequently (like scroll or resize, or MutationObserver).
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
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

// --- Toast Notification Helpers ---
const HONEY_BARREL_TOAST_ID = 'honey-barrel-toast-container';
let toastTimeout = null; // Timeout ID for hiding the toast

/**
 * Injects the necessary CSS styles for the toast notification into the page head.
 * Ensures styles are only added once.
 */
function addStyles() {
  const styleId = 'honey-barrel-styles';
  if (document.getElementById(styleId)) return; // Styles already added

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    #${HONEY_BARREL_TOAST_ID} {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #333; /* Default info style */
      color: white;
      padding: 12px 20px;
      border-radius: 5px;
      z-index: 10000; /* Ensure it's above most elements */
      font-family: sans-serif;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      pointer-events: none; /* Prevent interaction with toast */
    }
    #${HONEY_BARREL_TOAST_ID}.show {
      opacity: 1;
    }
    #${HONEY_BARREL_TOAST_ID}.error {
        background-color: #d9534f; /* Red for errors */
    }
    #${HONEY_BARREL_TOAST_ID}.success {
        background-color: #5cb85c; /* Green for success */
    }
    /* Add other types (e.g., warning) if needed */
  `;
  document.head.appendChild(style);
}

/**
 * Displays a short-lived toast notification at the bottom-right of the page.
 * @param {string} message - The text message to display.
 * @param {number} [duration=3000] - How long the toast should be visible (in milliseconds).
 * @param {'info'|'success'|'error'} [type='info'] - The type of toast (affects background color).
 */
function showToast(message, duration = 3000, type = 'info') {
  addStyles(); // Ensure styles are present

  let toastContainer = document.getElementById(HONEY_BARREL_TOAST_ID);
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = HONEY_BARREL_TOAST_ID;
    document.body.appendChild(toastContainer);
  }

  toastContainer.textContent = message;
  toastContainer.className = ''; // Clear previous classes
  toastContainer.classList.add(type); // Add type class (info, success, error)

  // Make it visible using requestAnimationFrame for smooth transition start
  requestAnimationFrame(() => {
      toastContainer.classList.add('show');
  });

  // Clear existing timeout if a new toast is shown quickly, preventing premature hiding
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Set timeout to hide the toast after the specified duration
  toastTimeout = setTimeout(() => {
    if (toastContainer) { // Check if element still exists
        toastContainer.classList.remove('show');
    }
    // Optional: Remove the element from DOM after fade out transition completes
    // setTimeout(() => {
    //   if (toastContainer && !toastContainer.classList.contains('show')) {
    //      toastContainer.remove();
    //   }
    // }, 500); // Match transition duration
  }, duration);
}
// --- End Toast Notification Helpers ---

/**
 * Configuration object holding CSS selectors for extracting bottle name and price
 * from different supported e-commerce sites.
 */
const siteConfigs = {
  'www.wine.com': {
    name: 'wine.com',
    titleSelector: '.pipName',
    priceSelector: '.productPrice',
  },
  'spiritory.com': {
    name: 'spiritory.com',
    titleSelector: 'h1, .product-name, .text-breadcrumbs-active', // Use the first one found
    priceSelector: 'h2.tw-pt-3.tw-text-3xl.tw-font-medium.tw-text-text',
  },
  'caskcartel.com': {
    name: 'caskcartel.com',
    titleSelector: 'h1.product-title',
    priceSelector: 'strong.price__current',
  },
  'whisky.auction': {
    name: 'whisky.auction',
    titleSelector: 'span.lotName1.line-1',
    priceSelector: 'span.winningBid',
  },
  'www.caskers.com': {
    name: 'caskers.com', // Keep name without www for display/logging
    titleSelector: 'span[itemprop="name"]',
    priceSelector: 'span.price',
  },
  'www.baxus.co': {
    name: 'baxus.co', // Keep name without www for display/logging
    titleSelector: 'h1.h1.text-gray1',
    priceSelector: 'p.xsm\\:numbers-medium.md-numbers-large.text-gray1', // Escaped colon
  },
  'uptownspirits.com': {
    name: 'uptownspirits.com',
    titleSelector: 'h3.m5.mob-h4',
    priceSelector: 'p.f8pr-price.s1pr',
  }
  // Add more site configurations here as needed
};

/**
 * Stores the most recently extracted bottle information from the current page.
 * Used by the overlay and potentially by the popup via message passing.
 * @type {{name: string|null, price: string|null, normalizedName: string|null}}
 */
let currentBottleInfo = {
    name: null,           // Raw extracted name
    price: null,          // Raw extracted price string (e.g., "$123.45", "€99.00")
    normalizedName: null  // Name after normalization for comparison
};

/**
 * Gets the configuration object for the current website based on its hostname.
 * @returns {object|null} The site configuration object or null if the site is not supported.
 */
function getSiteConfig() {
  const hostname = window.location.hostname;
  // console.log(`Honey Barrel: Detected hostname - ${hostname}`); // Debug log removed
  return siteConfigs[hostname] || null;
}

/**
 * Extracts the numeric value and currency symbol (USD, EUR, GBP) from a raw price string.
 * @param {string|null} rawPrice - The raw price string (e.g., "$123.45", "€99.00").
 * @returns {{value: number, currency: string}|null} An object with the numeric value and currency code, or null if parsing fails.
 */
function parsePrice(rawPrice) {
  if (!rawPrice) return null;

  let currency = 'USD'; // Default to USD
  // Detect currency symbol
  if (rawPrice.includes('€')) currency = 'EUR';
  else if (rawPrice.includes('£')) currency = 'GBP';
  else if (rawPrice.includes('$')) currency = 'USD';
  else if (rawPrice.toLowerCase().includes('rs.')) currency = 'INR'; // Detect INR
  // Add other currency symbols if needed

  // 1. Remove currency symbol and leading/trailing whitespace
  let processedPrice = rawPrice.replace(/(Rs\.|\$|€|£)\s*/i, '').trim();

  // 2. Remove thousand separators (commas)
  processedPrice = processedPrice.replace(/,/g, '');

  // 3. Remove any remaining non-numeric characters except the decimal point
  // (This is a safeguard against unexpected characters)
  const cleanedPrice = processedPrice.replace(/[^0-9.]/g, '');

  // 4. Parse the cleaned string
  const priceNum = parseFloat(cleanedPrice);

  if (isNaN(priceNum)) {
      // console.log(`Honey Barrel: Failed to parse price from raw string: "${rawPrice}"`); // Debug log removed
      return null;
  }
  return { value: priceNum, currency: currency };
}

/**
 * Processes the extracted name and price info:
 * 1. Updates the global `currentBottleInfo`.
 * 2. Logs the extracted information.
 * 3. Sends the structured data to the background script if both name and price are valid.
 * 4. Shows appropriate toast notifications.
 * @param {string|null} name - The extracted bottle name.
 * @param {{value: number, currency: string}|null} priceInfo - The parsed price object.
 * @param {string|null} rawPrice - The original raw price string.
 * @param {object} config - The site configuration object used for extraction.
 */
function processAndSendData(name, priceInfo, rawPrice, config) {
 const normalizedName = name ? normalizeBottleName(name) : null; // Normalize only if name exists

    // Update last known values
    currentBottleInfo.name = name;
    currentBottleInfo.price = rawPrice; // Store the raw string
    currentBottleInfo.normalizedName = normalizedName;

 // Log extracted info (keep these logs minimal)
 if (name) {
   console.log(`%cHoney Barrel DEBUG: Found Name - "${name}"`, 'color: blue; font-weight: bold;'); // Added temporary log
 } else {
   console.log(`Honey Barrel: Name element (${config.titleSelector}) not found.`);
  }

  if (priceInfo) {
    console.log(`%cHoney Barrel DEBUG: Parsed Price Info - Value: ${priceInfo.value}, Currency: ${priceInfo.currency}`, 'color: blue; font-weight: bold;'); // Added temporary log
  } else {
    console.log(`Honey Barrel: Price element (${config.priceSelector}) could not be parsed or was not found.`);
  }

  // Send data to background script only if we have both a name and valid price info
  if (name && priceInfo) {
    // If currency is INR, request conversion first
    if (priceInfo.currency === 'INR') {
        console.log('Honey Barrel: Requesting INR to USD conversion from background script...');
        showToast("Honey Barrel: Converting currency...", 2500, 'info');
        try {
            chrome.runtime.sendMessage({
                type: 'REQUEST_INR_CONVERSION',
                payload: {
                    name: name,
                    priceInfo: priceInfo, // Send original INR price info
                    normalizedName: normalizedName,
                    sourceSite: config.name
                }
            });
        } catch (error) {
            console.error("Honey Barrel: Error sending REQUEST_INR_CONVERSION message:", error);
            showToast("Honey Barrel: Currency conversion error.", 4000, 'error');
        }
    } else {
        // For USD, EUR, GBP, send directly for comparison
        console.log('Honey Barrel: Sending BOTTLE_INFO to background script...');
        showToast("Honey Barrel: Searching for matches...", 3000, 'info'); // Toast: Searching
        try {
            chrome.runtime.sendMessage({
              type: 'BOTTLE_INFO',
              payload: {
                name: name,
                priceInfo: priceInfo, // Send the parsed object (USD, EUR, GBP)
                normalizedName: normalizedName,
                sourceSite: config.name
              }
            });
        } catch (error) {
            console.error("Honey Barrel: Error sending BOTTLE_INFO message:", error);
            // Potentially show an error toast if sending fails critically
            // showToast("Honey Barrel: Communication error.", 4000, 'error');
        }
    }
  } else {
      console.log('Honey Barrel: Not sending message because name or price info is missing.');
      // Show error toast only if extraction was expected to succeed but failed
      if (name || rawPrice) { // If we found *something* but couldn't process it fully
        showToast("Honey Barrel: Error extracting info.", 4000, 'error'); // Toast: Error extracting
      }
  }
}


/**
 * Extracts the bottle name and price from the page based on the provided site configuration.
 * It attempts to find the name and price elements immediately. If the price element isn't
 * found (common on sites where price loads dynamically), it polls for the element for a
 * short period before giving up.
 * @param {object} config - The site configuration object containing CSS selectors.
 */
function extractProductInfoWithPolling(config) {
  if (!config) {
    console.log("Honey Barrel: Site not supported or config not found.");
    return;
  }

  // console.log(`Honey Barrel: Attempting to extract info from ${config.name}...`); // Debug log removed

  // --- Extract Name (usually available earlier) ---
  const nameElement = document.querySelector(config.titleSelector);
  const name = nameElement ? nameElement.textContent.trim() : null;
  if (!name) {
      console.log(`Honey Barrel: Name element (${config.titleSelector}) not found initially.`);
      // Proceed even without a name, price is the primary target for polling.
  } else {
      // console.log(`Honey Barrel: Found Name initially - ${name}`); // Debug log removed
  }


  // --- Attempt to Extract Price ---
  // console.log(`Honey Barrel: Attempting initial price element find with selector: "${config.priceSelector}"`); // Debug log removed
  let priceElement = document.querySelector(config.priceSelector);
  // console.log('Honey Barrel: Initial price element found:', priceElement); // Debug log removed

  if (priceElement) {
    // Price element found immediately
    const rawPrice = priceElement.textContent.trim();
    // console.log('Honey Barrel: Raw price text (initial find):', rawPrice); // Debug log removed
    const priceInfo = parsePrice(rawPrice);
    processAndSendData(name, priceInfo, rawPrice, config);
  } else {
    // Price element not found, start polling
    console.log(`Honey Barrel: Price element (${config.priceSelector}) not found initially. Starting polling...`);
    let attempts = 0;
    const maxAttempts = 10; // Poll for 5 seconds (10 * 500ms)
    const intervalId = setInterval(() => {
      attempts++;
      priceElement = document.querySelector(config.priceSelector);
      // console.log(`Honey Barrel: Polling attempt ${attempts}. Price element found:`, priceElement); // Debug log removed

      if (priceElement) {
        // Found the element via polling
        clearInterval(intervalId);
        console.log(`Honey Barrel: Price element found after ${attempts} polling attempts.`);
        const rawPrice = priceElement.textContent.trim();
        // console.log('Honey Barrel: Raw price text (found via polling):', rawPrice); // Debug log removed
        const priceInfo = parsePrice(rawPrice);
        processAndSendData(name, priceInfo, rawPrice, config);
      } else if (attempts >= maxAttempts) {
        // Polling timed out
        clearInterval(intervalId);
        console.log(`Honey Barrel: Price element (${config.priceSelector}) not found after ${maxAttempts} polling attempts.`);
        showToast("Honey Barrel: Error extracting price.", 4000, 'error'); // Toast: Error extracting price
        processAndSendData(name, null, null, config); // Process with null priceInfo and rawPrice
      }
    }, 500); // Poll every 500ms
  }
}

/**
 * Checks if the current site is supported and triggers the information extraction process
 * after a short delay. The delay helps ensure that dynamically loaded content
 * (especially on Single Page Applications) has a chance to render before extraction begins.
 */
function runExtraction() {
    const currentSiteConfig = getSiteConfig();
    if (currentSiteConfig) {
        // console.log("Honey Barrel: runExtraction triggered. Waiting 3 seconds before extracting info..."); // Debug log removed
        showToast("Honey Barrel: Checking page...", 2000, 'info'); // Toast: Checking page
        // Wait 3 seconds after trigger before attempting extraction
        // This delay helps ensure dynamic content has loaded after navigation or DOM changes
        setTimeout(() => {
            // console.log("Honey Barrel: 3-second delay complete. Starting info extraction."); // Debug log removed
            extractProductInfoWithPolling(currentSiteConfig);
        }, 3000); // 3000 milliseconds = 3 seconds
    } else {
        console.log("Honey Barrel: No configuration found for this site. Extraction aborted.");
    }
}

// --- Initial Execution ---
// Run extraction once when the content script is first injected or the page loads.
runExtraction();

// --- Mutation Observer for SPA/Dynamic Content ---
// This observer watches for changes in the DOM (like elements being added, removed, or changed).
// It's crucial for Single Page Applications (SPAs) where navigation doesn't cause a full page reload.
// When a relevant change is detected, it re-runs the extraction logic.

// Debounce the extraction function to prevent it from running too frequently during rapid DOM changes.
// Waits 1.5 seconds after the *last* detected change before running extraction.
const debouncedRunExtraction = debounce(runExtraction, 1500);

// Create the observer instance. The callback function is executed when mutations are observed.
const observer = new MutationObserver((mutationsList, observer) => {
    // Optimization: Check if the mutations occurred *only* within our own UI elements
    // (the toast notifications or the comparison overlay). If so, ignore them to prevent
    // an infinite loop where showing a toast/overlay triggers another extraction attempt.
    let shouldIgnore = true;
    for (const mutation of mutationsList) {
        // Check if the mutation target or any added/removed nodes are part of the toast or overlay
        const isToastMutation = mutation.target.closest(`#${HONEY_BARREL_TOAST_ID}`) ||
                                (mutation.addedNodes.length > 0 && mutation.addedNodes[0].id === HONEY_BARREL_TOAST_ID) ||
                                (mutation.removedNodes.length > 0 && mutation.removedNodes[0].id === HONEY_BARREL_TOAST_ID);

        const isOverlayMutation = mutation.target.closest('#honey-barrel-overlay') ||
                                  (mutation.addedNodes.length > 0 && mutation.addedNodes[0].id === 'honey-barrel-overlay') ||
                                  (mutation.removedNodes.length > 0 && mutation.removedNodes[0].id === 'honey-barrel-overlay');

        // If *any* mutation occurred outside our UI elements, we should *not* ignore it.
        if (!isToastMutation && !isOverlayMutation) {
            shouldIgnore = false;
            break; // No need to check further mutations
        }
    }

    if (shouldIgnore) {
        // console.log("Honey Barrel: MutationObserver ignoring changes within its own UI."); // Debug log removed
        return; // Exit the callback; don't run extraction for self-induced changes.
    }

    // If we reach here, a relevant DOM change (outside our UI) occurred.
    console.log("Honey Barrel: MutationObserver detected relevant DOM change. Triggering debounced extraction...");
    debouncedRunExtraction(); // Call the debounced function
});

// --- Start Observing ---
// Define the target node to observe (usually the entire document body).
const targetNode = document.body;
if (targetNode) {
    // Configuration for the observer:
    // - childList: true = watch for addition/removal of child nodes.
    // - subtree: true = watch descendants of the target node as well.
    const observerConfig = { childList: true, subtree: true };
    observer.observe(targetNode, observerConfig);
    console.log("Honey Barrel: MutationObserver started watching document body.");
    // Note: The observer runs as long as the content script is active on the page.
    // It doesn't automatically disconnect unless the page is unloaded or the script context is destroyed.
} else {
    console.error("Honey Barrel: Could not find document body to observe.");
}
/**
 * Creates and displays a comparison overlay in the bottom-right corner of the page.
 * The overlay shows the price of the bottle on the current site versus the price
 * of the best matching bottle found on BAXUS. Includes a link to the BAXUS listing.
 * @param {Array<object>} matches - An array of matching listings from BAXUS, sorted by similarity.
 * @param {object} bottleInfo - The extracted information about the bottle from the current page.
 */
function createComparisonOverlay(matches, bottleInfo) {
    // Remove existing overlay first to prevent duplicates
    const existingOverlay = document.getElementById('honey-barrel-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Ensure we have the necessary data to build the overlay
    const currentPriceInfo = parsePrice(bottleInfo.price); // Parse the raw price string
    if (!matches || matches.length === 0 || !currentPriceInfo || typeof currentPriceInfo.value !== 'number') {
        // console.log("Honey Barrel: Not creating overlay - missing matches or valid current price info."); // Debug log removed
        return; // Exit if data is insufficient
    }

    const bestMatch = matches[0]; // Use the highest similarity match
    const baxusPrice = bestMatch.price; // Price from the Baxus listing

    // Ensure Baxus price is a valid number before proceeding
    if (typeof baxusPrice !== 'number') {
        // console.log("Honey Barrel: Not creating overlay - Baxus price is not a valid number."); // Debug log removed
        return;
    }

    const currentPrice = currentPriceInfo.value;
    const priceDiff = currentPrice - baxusPrice; // Calculate the difference

    // --- Build Overlay DOM ---
    const overlay = document.createElement('div');
    overlay.id = 'honey-barrel-overlay';
    // Apply styles using CSS variables defined in popup/shared styles (with fallbacks)
    overlay.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: var(--bg-color, #FDFBF5);
        border: 1px solid var(--border-color, #EAE0D5);
        padding: 18px;
        z-index: 9999; /* High z-index to appear above most page elements */
        font-family: var(--font-sans, sans-serif);
        font-size: 14px;
        box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
        border-radius: var(--radius, 12px);
        color: var(--text-color, #5C3A21);
        min-width: 240px;
        max-width: 300px;
        line-height: 1.5;
        /* Transition for close animation */
        transition: opacity 0.2s ease-out, transform 0.2s ease-out;
        opacity: 0; /* Start hidden for fade-in */
        transform: translateY(10px); /* Start slightly lower for slide-in */
    `;

    // Header Section
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-color, #EAE0D5);
    `;
    const logoEmoji = document.createElement('span');
    logoEmoji.textContent = '🍾'; // Simple emoji logo
    logoEmoji.style.cssText = 'font-size: 24px; margin-right: 8px; line-height: 1;';
    header.appendChild(logoEmoji);

    const title = document.createElement('h3');
    title.textContent = 'Honey Price Check';
    title.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600; color: var(--primary-color, #5C3A21);';
    header.appendChild(title);
    overlay.appendChild(header);

    // Price Comparison Section
    const priceSection = document.createElement('div');
    priceSection.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';

    // Current Site Price Display
    const currentPriceDiv = document.createElement('div');
    currentPriceDiv.style.cssText = 'text-align: left;';
    const currentLabel = document.createElement('div');
    currentLabel.textContent = 'Current Site';
    currentLabel.style.cssText = 'font-size: 12px; color: var(--text-light, #8A7460); margin-bottom: 2px;';
    const currentValue = document.createElement('div');
    currentValue.textContent = `$${currentPrice.toFixed(2)}`; // Format as currency
    currentValue.style.cssText = 'font-size: 16px; font-weight: 500; color: var(--text-color, #5C3A21);';
    currentPriceDiv.appendChild(currentLabel);
    currentPriceDiv.appendChild(currentValue);
    priceSection.appendChild(currentPriceDiv);

    // BAXUS Price Display
    const baxusPriceDiv = document.createElement('div');
    baxusPriceDiv.style.cssText = 'text-align: right;';
    const baxusLabel = document.createElement('div');
    baxusLabel.textContent = 'on BAXUS';
    baxusLabel.style.cssText = 'font-size: 12px; color: var(--text-light, #8A7460); margin-bottom: 2px;';
    const baxusValue = document.createElement('div');
    baxusValue.textContent = `$${baxusPrice.toFixed(2)}`; // Format as currency
    baxusValue.style.cssText = 'font-size: 18px; font-weight: 600; color: var(--button-bg, #1C6D72);'; // Emphasize Baxus price
    baxusPriceDiv.appendChild(baxusLabel);
    baxusPriceDiv.appendChild(baxusValue);
    priceSection.appendChild(baxusPriceDiv);

    overlay.appendChild(priceSection);

    // Savings Message (Conditional)
    // Only show if the price on Baxus is lower (difference is positive)
    if (priceDiff > 0.01) { // Use a small threshold for floating point comparison
        const savingsDiv = document.createElement('div');
        savingsDiv.textContent = `Save $${priceDiff.toFixed(2)} on BAXUS!`;
        savingsDiv.style.cssText = `
            text-align: center;
            margin-bottom: 15px;
            padding: 8px;
            border-radius: var(--radius, 12px);
            font-weight: 600;
            background-color: var(--savings-bg, #E8F5E9); /* Greenish background */
            color: var(--savings-color-text, #388E3C); /* Dark green text */
            border: 1px solid var(--border-color, #EAE0D5);
        `;
        overlay.appendChild(savingsDiv);
    }
    // Note: Messages for "costs more" or "same price" are omitted for simplicity.

    // BAXUS Link Button
    const baxusLink = document.createElement('a');
    baxusLink.href = `https://baxus.co/asset/${bestMatch.id}`; // Link to the specific asset
    baxusLink.textContent = 'View on BAXUS →';
    baxusLink.target = '_blank'; // Open in a new tab
    baxusLink.rel = 'noopener noreferrer'; // Security best practice for target="_blank"
    baxusLink.style.cssText = `
        display: block;
        text-align: center;
        background-color: var(--button-bg, #1C6D72);
        color: var(--button-text, #FDFBF5);
        padding: 10px 15px;
        border-radius: var(--radius, 12px);
        text-decoration: none;
        font-weight: 600;
        transition: background-color 0.2s ease;
        margin-top: 10px;
        border: none;
    `;
    // Hover effect using JS (could also be done with CSS if styles were in a sheet)
    const buttonBg = 'var(--button-bg, #1C6D72)';
    const buttonHoverBg = 'var(--button-hover-bg, #458D91)';
    baxusLink.onmouseover = () => baxusLink.style.backgroundColor = buttonHoverBg;
    baxusLink.onmouseout = () => baxusLink.style.backgroundColor = buttonBg;
    overlay.appendChild(baxusLink);

    // Close Button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;'; // 'X' symbol
    closeButton.setAttribute('aria-label', 'Close price comparison'); // Accessibility
    closeButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: transparent;
        border: none;
        font-size: 22px;
        font-weight: bold;
        cursor: pointer;
        color: var(--text-light, #8A7460);
        padding: 0 5px;
        line-height: 1;
        transition: color 0.2s ease;
    `;
    closeButton.onmouseover = () => closeButton.style.color = 'var(--text-color, #5C3A21)'; // Darken on hover
    closeButton.onmouseout = () => closeButton.style.color = 'var(--text-light, #8A7460)';
    // Click handler to close and remove the overlay with animation
    closeButton.onclick = () => {
        overlay.style.opacity = '0';
        overlay.style.transform = 'scale(0.9)'; // Optional shrink effect
        setTimeout(() => overlay.remove(), 200); // Remove after transition (matches transition duration)
    };
    overlay.appendChild(closeButton);

    // --- Append and Animate In ---
    document.body.appendChild(overlay);
    // console.log("Honey Barrel: Comparison overlay created."); // Debug log removed

    // Trigger fade-in/slide-in animation
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateY(0)';
    });
}


// --- Message Listener ---
// Handles messages received from other parts of the extension (popup, background script).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log("Honey Barrel (content): Received message:", request); // Debug log removed

    switch (request.type) {
        case 'GET_BOTTLE_INFO':
            // The popup script is requesting the latest bottle information extracted from this page.
            // Re-parse the stored raw price to ensure the priceInfo object is up-to-date.
            const priceInfo = parsePrice(currentBottleInfo.price);
            // console.log("Honey Barrel (content): Sending response for GET_BOTTLE_INFO:", { bottleInfo: { name: currentBottleInfo.name, priceInfo: priceInfo, normalizedName: currentBottleInfo.normalizedName } }); // Debug log removed
            // Respond with the last known bottle info stored in the global variable.
            sendResponse({
                bottleInfo: {
                    name: currentBottleInfo.name,
                    priceInfo: priceInfo, // Send the parsed price info object
                    normalizedName: currentBottleInfo.normalizedName
                }
            });
            // Note: `return true;` is intentionally omitted here if sendResponse is called synchronously within the handler.
            // However, if any async operations were needed before sending, `return true;` would be required.
            // Let's keep it for clarity as sendResponse *can* be async depending on context.
            return true; // Indicate potential async response (good practice).

        case 'DISPLAY_OVERLAY':
            // The background script has sent matching listings and requests the overlay to be displayed.
            // console.log("Honey Barrel (content): Received DISPLAY_OVERLAY message with matches:", request.matches); // Debug log removed
            if (request.matches && request.matches.length > 0) {
                // Use the globally stored currentBottleInfo along with the received matches.
                createComparisonOverlay(request.matches, currentBottleInfo);
            } else {
                // console.log("Honey Barrel (content): No matches received, not displaying overlay."); // Debug log removed
                showToast("Honey Barrel: No matches found on BAXUS.", 4000, 'info'); // Inform user if no matches
            }
            // No response needs to be sent back for this message type.
            return false; // Indicate synchronous handling (no response expected).

case 'CONVERTED_PRICE_INFO':
            // Background script sent back the USD-converted price info.
            console.log("Honey Barrel (content): Received CONVERTED_PRICE_INFO message:", request.payload);
            const convertedPayload = request.payload;
            if (convertedPayload && convertedPayload.priceInfo && convertedPayload.priceInfo.currency === 'USD') {
                // Now send the BOTTLE_INFO message with the converted USD price for comparison
                console.log('Honey Barrel: Sending BOTTLE_INFO with converted USD price to background script...');
                showToast("Honey Barrel: Searching for matches...", 3000, 'info'); // Toast: Searching
                try {
                    chrome.runtime.sendMessage({
                      type: 'BOTTLE_INFO',
                      payload: {
                        name: convertedPayload.name,
                        priceInfo: convertedPayload.priceInfo, // Use the converted USD priceInfo
                        normalizedName: convertedPayload.normalizedName,
                        sourceSite: convertedPayload.sourceSite
                      }
                    });
                } catch (error) {
                    console.error("Honey Barrel: Error sending BOTTLE_INFO message after conversion:", error);
                    showToast("Honey Barrel: Communication error.", 4000, 'error');
                }
            } else {
                console.error("Honey Barrel: Received invalid CONVERTED_PRICE_INFO payload:", request.payload);
                showToast("Honey Barrel: Currency conversion failed.", 4000, 'error');
            }
            return false; // Indicate synchronous handling
        default:
            // Handle unknown message types gracefully.
            // console.log(`Honey Barrel (content): Received unhandled message type: ${request.type}`); // Debug log removed
            return false; // Indicate synchronous handling (no response expected).
    }
});