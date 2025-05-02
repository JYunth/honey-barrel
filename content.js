function normalizeBottleName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\b(the|limited|edition|release|single|barrel|cask|strength|proof|year|old|aged|distillery|winery|vineyard|chateau|domaine)\b/g, '') // Remove common terms
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}
// Debounce function to limit how often a function can run
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
let toastTimeout = null;

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
      background-color: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 5px;
      z-index: 10000; /* Ensure it's above most elements */
      font-family: sans-serif;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
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
  `;
  document.head.appendChild(style);
}

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

  // Make it visible
  requestAnimationFrame(() => {
      toastContainer.classList.add('show');
  });


  // Clear existing timeout if a new toast is shown quickly
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Set timeout to hide the toast
  toastTimeout = setTimeout(() => {
    toastContainer.classList.remove('show');
    // Optional: Remove the element after fade out transition completes
    // setTimeout(() => {
    //   if (toastContainer && !toastContainer.classList.contains('show')) {
    //      toastContainer.remove();
    //   }
    // }, 500); // Match transition duration
  }, duration);
}
// --- End Toast Notification Helpers ---
/**
 * Configuration object holding selectors for different supported sites.
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
    priceSelector: 'h2.tw-pt-3.tw-text-3xl.tw-font-medium.tw-text-text', // Updated selector for H2 element
  },
  'caskcartel.com': {
    name: 'caskcartel.com',
    titleSelector: 'h1.product-title',
    priceSelector: 'strong.price__current', // Updated based on user feedback
  },
  'whisky.auction': {
    name: 'whisky.auction',
    titleSelector: 'span.lotName1.line-1', // Updated based on user feedback
    priceSelector: 'span.winningBid', // Updated based on user feedback
  },
  'www.caskers.com': { // Updated key to include 'www.'
    name: 'caskers.com', // Keep name without www for display/logging
    titleSelector: 'span[itemprop="name"]', // Updated based on user feedback
    priceSelector: 'span.price', // Updated based on user feedback
  },
  'www.baxus.co': { // Updated key to include 'www.'
    name: 'baxus.co', // Keep name without www for display/logging
    titleSelector: 'h1.h1.text-gray1', // Updated based on user feedback
    priceSelector: 'p.xsm\\:numbers-medium.md-numbers-large.text-gray1', // Updated based on user feedback (escaped colon)
  }
};

// Variables to store the last extracted info
let currentBottleInfo = { // Store info for potential overlay use
    name: null,
    price: null, // Store the raw price string
    normalizedName: null
};

/**
* Gets the configuration for the current site based on the hostname.
 */
function getSiteConfig() {
  const hostname = window.location.hostname;
  console.log(`Honey Barrel: Detected hostname - ${hostname}`);
  return siteConfigs[hostname] || null;
}

/**
 * Extracts the numeric value and currency symbol from a raw price string.
 */
function parsePrice(rawPrice) {
  if (!rawPrice) return null;
  let currency = 'USD';
  if (rawPrice.includes('€')) currency = 'EUR';
  else if (rawPrice.includes('£')) currency = 'GBP';
  else if (rawPrice.includes('$')) currency = 'USD';
  const cleanedPrice = rawPrice.replace(/[^0-9.]/g, '');
  const priceNum = parseFloat(cleanedPrice);
  if (isNaN(priceNum)) return null;
  return { value: priceNum, currency: currency };
}

/**
 * Processes the extracted info (logs and sends message).
 */
function processAndSendData(name, priceInfo, rawPrice, config) { // Added rawPrice parameter
 const normalizedName = normalizeBottleName(name); // Normalize the name

    // Update last known values
    currentBottleInfo.name = name;
    currentBottleInfo.price = rawPrice; // Store the raw string
    currentBottleInfo.normalizedName = normalizedName;

 if (name) {
   console.log(`Honey Barrel: Found Name - ${name}`);
 } else {
    console.log(`Honey Barrel: Name element (${config.titleSelector}) not found.`);
  }

  if (priceInfo) {
    console.log(`Honey Barrel: Parsed Price Info - Value: ${priceInfo.value}, Currency: ${priceInfo.currency}`);
  } else {
    // This case might not be reached if polling fails, but good for robustness
    console.log(`Honey Barrel: Price element (${config.priceSelector}) could not be parsed or was not found.`);
  }

  // Send data to background script if both name and parsed price info are found
  if (name && priceInfo) {
    console.log('Honey Barrel: Sending structured price data to background script...');
    showToast("Honey Barrel: Searching for matches...", 3000, 'info'); // Toast: Searching
    chrome.runtime.sendMessage({
      type: 'BOTTLE_INFO',
      payload: {
        name: name,
        priceInfo: priceInfo,
        normalizedName: normalizedName, // Include normalized name
        sourceSite: config.name
      }
    });
  } else {
      console.log('Honey Barrel: Not sending message because name or price info is missing.');
      showToast("Honey Barrel: Error extracting info.", 4000, 'error'); // Toast: Error extracting
  }
}


/**
 * Extracts product information, polling for the price element if necessary.
 */
function extractProductInfoWithPolling(config) {
  if (!config) {
    console.log("Honey Barrel: Site not supported or config not found.");
    return;
  }

  console.log(`Honey Barrel: Attempting to extract info from ${config.name}...`);

  // --- Extract Name (usually available earlier) ---
  const nameElement = document.querySelector(config.titleSelector);
  const name = nameElement ? nameElement.textContent.trim() : null;
  if (!name) {
      console.log(`Honey Barrel: Name element (${config.titleSelector}) not found initially.`);
      // Decide if we should proceed without a name or poll for it too (simpler for now to proceed)
  } else {
      console.log(`Honey Barrel: Found Name initially - ${name}`);
  }


  // --- Attempt to Extract Price ---
  console.log(`Honey Barrel: Attempting initial price element find with selector: "${config.priceSelector}"`);
  let priceElement = document.querySelector(config.priceSelector);
  console.log('Honey Barrel: Initial price element found:', priceElement);

  if (priceElement) {
    // Element found immediately
    const rawPrice = priceElement.textContent.trim();
    console.log('Honey Barrel: Raw price text (initial find):', rawPrice);
    const priceInfo = parsePrice(rawPrice);
    processAndSendData(name, priceInfo, rawPrice, config); // Pass rawPrice
  } else {
    // Element not found, start polling
    console.log(`Honey Barrel: Price element not found initially. Starting polling for selector: "${config.priceSelector}"`);
    let attempts = 0;
    const maxAttempts = 10; // Poll for 5 seconds (10 * 500ms)
    const intervalId = setInterval(() => {
      attempts++;
      priceElement = document.querySelector(config.priceSelector);
      console.log(`Honey Barrel: Polling attempt ${attempts}. Price element found:`, priceElement);

      if (priceElement) {
        // Found the element
        clearInterval(intervalId);
        console.log(`Honey Barrel: Price element found after ${attempts} polling attempts.`);
        const rawPrice = priceElement.textContent.trim();
        console.log('Honey Barrel: Raw price text (found via polling):', rawPrice);
        const priceInfo = parsePrice(rawPrice);
        processAndSendData(name, priceInfo, rawPrice, config); // Pass rawPrice
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

// --- Function to Trigger Extraction ---
function runExtraction() {
    const currentSiteConfig = getSiteConfig();
    if (currentSiteConfig) {
        console.log("Honey Barrel: runExtraction triggered. Waiting 3 seconds before extracting info...");
        showToast("Honey Barrel: Checking page...", 2000, 'info'); // Toast: Checking page
        // Wait 3 seconds after trigger before attempting extraction
        // This delay helps ensure dynamic content has loaded after navigation
        setTimeout(() => {
            console.log("Honey Barrel: 3-second delay complete. Starting info extraction.");
            extractProductInfoWithPolling(currentSiteConfig);
        }, 3000); // 3000 milliseconds = 3 seconds
    } else {
        console.log("Honey Barrel: No configuration found for this site. Extraction aborted.");
    }
}

// --- Initial Execution ---
runExtraction(); // Run once on initial load

// --- Mutation Observer for SPA/Dynamic Content ---
const debouncedRunExtraction = debounce(runExtraction, 1500); // Debounce extraction calls by 1.5 seconds

const observer = new MutationObserver((mutationsList, observer) => {
    // Check if the mutations are solely within our own UI elements (toast/overlay)
    let shouldIgnore = true;
    for (const mutation of mutationsList) {
        // Check if the mutation target or added/removed nodes are part of the toast or overlay
        const isToastMutation = mutation.target.closest(`#${HONEY_BARREL_TOAST_ID}`) ||
                                (mutation.addedNodes.length > 0 && mutation.addedNodes[0].id === HONEY_BARREL_TOAST_ID) ||
                                (mutation.removedNodes.length > 0 && mutation.removedNodes[0].id === HONEY_BARREL_TOAST_ID);

        const isOverlayMutation = mutation.target.closest('#honey-barrel-overlay') ||
                                  (mutation.addedNodes.length > 0 && mutation.addedNodes[0].id === 'honey-barrel-overlay') ||
                                  (mutation.removedNodes.length > 0 && mutation.removedNodes[0].id === 'honey-barrel-overlay');


        if (!isToastMutation && !isOverlayMutation) {
            // If even one mutation is outside our UI, we should not ignore it
            shouldIgnore = false;
            break;
        }
    }

    if (shouldIgnore) {
        // console.log("Honey Barrel: MutationObserver ignoring changes within its own UI.");
        return; // Don't run extraction if changes are just within toast/overlay
    }

    // If we haven't returned, it means a relevant DOM change occurred
    console.log("Honey Barrel: MutationObserver detected relevant DOM change. Debouncing extraction trigger...");
    debouncedRunExtraction();
});

// Start observing the body for changes in the subtree and child list
// Adjust target node and config if needed for specific sites, but body is a good general start
const targetNode = document.body;
if (targetNode) {
    const config = { childList: true, subtree: true };
    observer.observe(targetNode, config);
    console.log("Honey Barrel: MutationObserver started watching document body.");
} else {
    console.error("Honey Barrel: Could not find document body to observe.");
}
// --- Overlay Function (Enhanced) ---
function createComparisonOverlay(matches, bottleInfo) {
    // Remove existing overlay first
    const existingOverlay = document.getElementById('honey-barrel-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Ensure we have necessary data
    const currentPriceInfo = parsePrice(bottleInfo.price);
    if (!matches || matches.length === 0 || !currentPriceInfo || !currentPriceInfo.value) {
        console.log("Honey Barrel: Not creating overlay - missing matches or valid current price info.");
        return;
    }

    const bestMatch = matches[0]; // Highest similarity match
    const baxusPrice = bestMatch.price; // Assuming this is a number

    if (typeof baxusPrice !== 'number') {
        console.log("Honey Barrel: Not creating overlay - Baxus price is not a valid number.");
        return; // Don't show overlay if Baxus price isn't valid
    }

    const currentPrice = currentPriceInfo.value;
    const priceDiff = currentPrice - baxusPrice;

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'honey-barrel-overlay';
    // Enhanced styling
    overlay.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(145deg, #ffffff, #f0f0f0); /* Subtle gradient */
        border: 1px solid #e0e0e0;
        padding: 18px;
        z-index: 9999;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* Nicer font */
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); /* Softer shadow */
        border-radius: 8px; /* More rounded corners */
        color: #333;
        min-width: 240px; /* Slightly wider */
        max-width: 300px;
        line-height: 1.5;
        transition: transform 0.3s ease-out; /* Add transition for potential future animations */
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
    `;
    // Simple Logo/Icon (Placeholder) - Replace 'path/to/icon.png' if you have one
    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('images/icon48.png'); // Use extension icon
    logo.alt = 'HB';
    logo.style.cssText = 'width: 24px; height: 24px; margin-right: 8px;';
    header.appendChild(logo);

    const title = document.createElement('h3');
    title.textContent = 'Honey Barrel Price Check';
    title.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600; color: #444;';
    header.appendChild(title);
    overlay.appendChild(header);

    // Price Comparison Section
    const priceSection = document.createElement('div');
    priceSection.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';

    // Current Price Div
    const currentPriceDiv = document.createElement('div');
    currentPriceDiv.style.cssText = 'text-align: left;';
    const currentLabel = document.createElement('div');
    currentLabel.textContent = 'Current Site';
    currentLabel.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 2px;';
    const currentValue = document.createElement('div');
    currentValue.textContent = `$${currentPrice.toFixed(2)}`;
    currentValue.style.cssText = 'font-size: 16px; font-weight: 500; color: #555;';
    currentPriceDiv.appendChild(currentLabel);
    currentPriceDiv.appendChild(currentValue);
    priceSection.appendChild(currentPriceDiv);

    // Baxus Price Div
    const baxusPriceDiv = document.createElement('div');
    baxusPriceDiv.style.cssText = 'text-align: right;';
    const baxusLabel = document.createElement('div');
    baxusLabel.textContent = 'on BAXUS';
    baxusLabel.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 2px;';
    const baxusValue = document.createElement('div');
    baxusValue.textContent = `$${baxusPrice.toFixed(2)}`;
    baxusValue.style.cssText = 'font-size: 18px; font-weight: 600; color: #007bff;'; // Make Baxus price stand out
    baxusPriceDiv.appendChild(baxusLabel);
    baxusPriceDiv.appendChild(baxusValue);
    priceSection.appendChild(baxusPriceDiv);

    overlay.appendChild(priceSection);

    // Savings/Difference Message
    const savingsDiv = document.createElement('div');
    savingsDiv.style.cssText = `
        text-align: center;
        margin-bottom: 15px;
        padding: 8px;
        border-radius: 4px;
        font-weight: 600;
    `;
    if (priceDiff > 0.01) { // Use a small threshold for floating point comparison
        savingsDiv.textContent = `Save $${priceDiff.toFixed(2)} on BAXUS!`;
        savingsDiv.style.backgroundColor = '#d4edda'; // Light green background
        savingsDiv.style.color = '#155724'; // Dark green text
        savingsDiv.style.border = '1px solid #c3e6cb';
    } else if (priceDiff < -0.01) {
        savingsDiv.textContent = `Costs $${Math.abs(priceDiff).toFixed(2)} more on BAXUS`;
        savingsDiv.style.backgroundColor = '#f8d7da'; // Light red background
        savingsDiv.style.color = '#721c24'; // Dark red text
        savingsDiv.style.border = '1px solid #f5c6cb';
    } else {
        savingsDiv.textContent = 'Same price on BAXUS';
        savingsDiv.style.backgroundColor = '#e2e3e5'; // Light gray background
        savingsDiv.style.color = '#383d41'; // Dark gray text
        savingsDiv.style.border = '1px solid #d6d8db';
    }
    overlay.appendChild(savingsDiv);


    // Baxus Link (Button style)
    const baxusLink = document.createElement('a');
    baxusLink.href = `https://baxus.co/asset/${bestMatch.id}`;
    baxusLink.textContent = 'View on BAXUS →';
    baxusLink.target = '_blank'; // Open in new tab
    baxusLink.style.cssText = `
        display: block;
        text-align: center;
        background-color: #007bff;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        text-decoration: none;
        font-weight: 500;
        transition: background-color 0.2s ease;
        margin-top: 10px; /* Ensure space above */
    `;
    baxusLink.onmouseover = () => baxusLink.style.backgroundColor = '#0056b3';
    baxusLink.onmouseout = () => baxusLink.style.backgroundColor = '#007bff';
    overlay.appendChild(baxusLink);

    // Close Button (Improved)
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;'; // Use HTML entity for 'X'
    closeButton.style.cssText = `
        position: absolute;
        top: 8px; /* Adjusted position */
        right: 8px; /* Adjusted position */
        background: transparent;
        border: none;
        font-size: 22px; /* Larger size */
        font-weight: bold;
        cursor: pointer;
        color: #aaa;
        padding: 0 5px; /* Minimal padding */
        line-height: 1;
        transition: color 0.2s ease;
    `;
    closeButton.onmouseover = () => closeButton.style.color = '#666';
    closeButton.onmouseout = () => closeButton.style.color = '#aaa';
    closeButton.onclick = () => {
        overlay.style.transform = 'scale(0.9)'; // Optional: Add shrink effect on close
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200); // Remove after transition
    };
    overlay.appendChild(closeButton);

    // Append overlay to body
    document.body.appendChild(overlay);
    console.log("Honey Barrel: Enhanced comparison overlay created.");
    // Optional: Add fade-in animation
    overlay.style.opacity = '0';
    overlay.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
        overlay.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateY(0)';
    });
}


// --- Message Listener for Popup and Background Requests ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Honey Barrel (content): Received message:", request);

    if (request.type === 'GET_BOTTLE_INFO') {
        // Re-parse the stored raw price to create the structured priceInfo object
        const priceInfo = parsePrice(currentBottleInfo.price);
        console.log("Honey Barrel (content): Sending response for GET_BOTTLE_INFO:", { bottleInfo: { name: currentBottleInfo.name, priceInfo: priceInfo, normalizedName: currentBottleInfo.normalizedName } });
        // Respond with the last known bottle info
        sendResponse({
            bottleInfo: {
                name: currentBottleInfo.name,
                priceInfo: priceInfo, // Send the parsed price info object
                normalizedName: currentBottleInfo.normalizedName // Send the normalized name
            }
        });
        return true; // Indicate async response
    } else if (request.type === 'DISPLAY_OVERLAY') {
        console.log("Honey Barrel (content): Received DISPLAY_OVERLAY message with matches:", request.matches);
        if (request.matches && request.matches.length > 0) {
            // Use the globally stored currentBottleInfo
            createComparisonOverlay(request.matches, currentBottleInfo);
        } else {
            console.log("Honey Barrel (content): No matches received, not displaying overlay.");
            showToast("Honey Barrel: No matches found on BAXUS.", 4000, 'info'); // Toast: No matches
        }
        // No response needed for this message type
        return false;
    }

    // Indicate synchronous response or no response for other types
    return false;
});