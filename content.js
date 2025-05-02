function normalizeBottleName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\b(the|limited|edition|release|single|barrel|cask|strength|proof|year|old|aged|distillery|winery|vineyard|chateau|domaine)\b/g, '') // Remove common terms
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
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
let lastBottleName = null;
let lastBottlePrice = null; // Store the raw price string for simplicity now
let lastNormalizedName = null; // Store the normalized name

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
 lastBottleName = name;
 lastBottlePrice = rawPrice; // Store the raw string as requested by popup
 lastNormalizedName = normalizedName; // Store the normalized name

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

// --- Main Execution ---
const currentSiteConfig = getSiteConfig();
if (currentSiteConfig) {
  console.log("Honey Barrel: Configuration found. Waiting 3 seconds before extracting info...");
  // Wait 3 seconds after document_idle before attempting extraction
  setTimeout(() => {
    console.log("Honey Barrel: 3-second delay complete. Starting info extraction.");
    // Use the polling function
    extractProductInfoWithPolling(currentSiteConfig);
  }, 3000); // 3000 milliseconds = 3 seconds
} else {
  console.log("Honey Barrel: No configuration found for this site.");
}

// --- Message Listener for Popup Requests ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
 console.log("Honey Barrel (content): Received message:", request);
 if (request.type === 'GET_BOTTLE_INFO') {
   // Re-parse the stored raw price to create the structured priceInfo object
   const priceInfo = parsePrice(lastBottlePrice);
   console.log("Honey Barrel (content): Sending response:", { bottleInfo: { name: lastBottleName, priceInfo: priceInfo } });
   // Respond with the last known bottle info in the structure popup.js expects
   sendResponse({
       bottleInfo: {
           name: lastBottleName,
           priceInfo: priceInfo, // Send the parsed price info object
           normalizedName: lastNormalizedName // Send the normalized name
       }
   });
   // Return true to indicate you wish to send a response asynchronously
   // (although in this simple case it's synchronous, it's good practice)
   return true;
 }
 // Handle other message types if needed in the future
 return false; // Indicate synchronous response or no response for other types
});