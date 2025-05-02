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
    priceSelector: 'strong.tw-text-2xl.tw-font-medium.tw-text-text', // Specific selector
  }
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
function processAndSendData(name, priceInfo, config) {
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
    processAndSendData(name, priceInfo, config);
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
        processAndSendData(name, priceInfo, config);
      } else if (attempts >= maxAttempts) {
        // Polling timed out
        clearInterval(intervalId);
        console.log(`Honey Barrel: Price element (${config.priceSelector}) not found after ${maxAttempts} polling attempts.`);
        processAndSendData(name, null, config); // Process with null priceInfo
      }
    }, 500); // Poll every 500ms
  }
}

// --- Main Execution ---
const currentSiteConfig = getSiteConfig();
if (currentSiteConfig) {
  // Use the polling function
  extractProductInfoWithPolling(currentSiteConfig);
} else {
  console.log("Honey Barrel: No configuration found for this site.");
}