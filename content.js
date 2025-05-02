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
    // We don't need to inspect mutationsList in detail for this simple case.
    // Any significant DOM change *might* be a navigation.
    // Debouncing prevents excessive calls.
    console.log("Honey Barrel: MutationObserver detected DOM change. Debouncing extraction trigger...");
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
// --- Overlay Function ---
function createComparisonOverlay(matches, bottleInfo) {
    // Remove existing overlay first
    const existingOverlay = document.getElementById('honey-barrel-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    if (!matches || matches.length === 0 || !bottleInfo || !bottleInfo.price) {
        console.log("Honey Barrel: Not creating overlay - missing matches or current price.");
        return;
    }

    const bestMatch = matches[0]; // Highest similarity match

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'honey-barrel-overlay';
    overlay.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border: 1px solid #ccc;
        padding: 15px;
        z-index: 9999;
        font-family: sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        border-radius: 4px;
        color: #333;
        min-width: 200px;
    `;

    // Header
    const header = document.createElement('h3');
    header.textContent = 'Honey Barrel Comparison';
    header.style.cssText = 'margin-top: 0; margin-bottom: 10px; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px;';
    overlay.appendChild(header);

    // Current Price
    const currentPriceP = document.createElement('p');
    currentPriceP.textContent = `Current: ${bottleInfo.price}`; // Use the raw price string
    currentPriceP.style.cssText = 'margin: 5px 0;';
    overlay.appendChild(currentPriceP);

    // Baxus Price
    const baxusPriceP = document.createElement('p');
    // Assuming bestMatch.price is already formatted like "$XXX.XX"
    baxusPriceP.textContent = `Baxus: ${bestMatch.price || 'N/A'}`;
    baxusPriceP.style.cssText = 'margin: 5px 0;';
    overlay.appendChild(baxusPriceP);

    // Baxus Link
    const baxusLink = document.createElement('a');
    baxusLink.href = `https://baxus.co/asset/${bestMatch.id}`;
    baxusLink.textContent = 'View on Baxus';
    baxusLink.target = '_blank'; // Open in new tab
    baxusLink.style.cssText = 'color: #007bff; text-decoration: none; display: block; margin-top: 10px;';
    overlay.appendChild(baxusLink);

    // Close Button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #aaa;
        padding: 5px;
        line-height: 1;
    `;
    closeButton.onclick = () => {
        overlay.remove();
    };
    overlay.appendChild(closeButton);

    // Append overlay to body
    document.body.appendChild(overlay);
    console.log("Honey Barrel: Comparison overlay created.");
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
        }
        // No response needed for this message type
        return false;
    }

    // Indicate synchronous response or no response for other types
    return false;
});