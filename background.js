// Hardcoded conversion rate (Update this value as needed)
// TODO: Get latest rate from user or find a more dynamic solution later.
const EUR_TO_USD_RATE = 1.14; // Example: 1 EUR = 1.1 USD

/**
 * Converts an amount from EUR to USD using a hardcoded rate.
 * Other conversions are not supported in this simplified version.
 * @param {number} amount - The amount to convert.
 * @param {string} fromCurrency - The 3-letter currency code to convert from (should be 'EUR').
 * @param {string} toCurrency - The 3-letter currency code to convert to (should be 'USD').
 * @returns {number|null} The converted amount in USD or null if conversion is not supported/fails.
 */
function convertCurrencyHardcoded(amount, fromCurrency, toCurrency) {
  console.log(`[Honey Barrel BG] Attempting hardcoded conversion: ${amount} ${fromCurrency} to ${toCurrency}`);

  if (fromCurrency === toCurrency) {
    console.log('[Honey Barrel BG] Source and target currency are the same.');
    return amount;
  }

  if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    const convertedAmount = amount * EUR_TO_USD_RATE;
    console.log(`[Honey Barrel BG] Hardcoded Conversion successful: ${amount} * ${EUR_TO_USD_RATE} = ${convertedAmount.toFixed(2)} ${toCurrency}`);
    return convertedAmount;
  } else {
    console.warn(`[Honey Barrel BG] Hardcoded conversion only supports EUR to USD. Cannot convert ${fromCurrency} to ${toCurrency}.`);
    return null; // Indicate unsupported conversion
  }
}

/**
 * Fetches listings from the Baxus API.
 * @param {string} bottleName - The name of the bottle to search for (currently unused, fetches general list).
 * @returns {Promise<Array<object>>} A promise that resolves to an array of listing objects (_source property) or an empty array on error.
 */
async function searchBaxusListings(bottleName) {
  // TODO: Incorporate bottleName into the search query later.
  // For now, we fetch a general list as requested in Commit 6.
  console.log(`[Honey Barrel BG] Searching Baxus API for: ${bottleName || 'general listings (Commit 6)'}`);
  const apiUrl = 'https://services.baxus.co/api/search/listings?from=0&size=50&listed=true';

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`[Honey Barrel BG] Baxus API request failed: ${response.status} ${response.statusText}`);
      const errorBody = await response.text(); // Try to get error body
      console.error(`[Honey Barrel BG] Error body: ${errorBody}`);
      return []; // Return empty array on HTTP error
    }

    const data = await response.json();
    console.log('[Honey Barrel BG] Received Baxus API response (raw):', data);

    // Based on the provided JSON, the response is a direct array.
    // We need to extract the _source from each item.
    if (Array.isArray(data)) {
        const listings = data.map(item => item._source).filter(Boolean); // Extract _source and filter out any nulls
        console.log(`[Honey Barrel BG] Extracted ${listings.length} listings from API response.`);
        return listings;
    } else {
        console.error('[Honey Barrel BG] Baxus API response was not an array as expected.');
        return [];
    }

  } catch (error) {
    console.error('[Honey Barrel BG] Error fetching or parsing Baxus listings:', error);
    return []; // Return empty array on network error or JSON parsing exception
  }
}


// Combined listener for messages from content script and popup
// Note: The listener function itself needs to handle async responses correctly.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`[Honey Barrel BG] Message listener triggered for type: ${request.type}`);

  if (request.type === 'BOTTLE_INFO') {
    console.log('[Honey Barrel BG] Processing BOTTLE_INFO from content script.');
    const bottleName = request.payload?.name;
    const sourceSite = request.payload?.sourceSite || 'unknown site';
    console.log(`[Honey Barrel BG] Received BOTTLE_INFO from ${sourceSite}:`, request.payload);


    // Just log the info for now. The popup will initiate the search.
    if (!bottleName) {
      console.warn('[Honey Barrel BG] No bottle name found in BOTTLE_INFO payload.');
    }

    // Handle currency conversion if needed (keeping existing logic for now)
    const priceInfo = request.payload?.priceInfo;
    if (priceInfo && priceInfo.currency && priceInfo.currency !== 'USD') {
      console.log(`[Honey Barrel BG] Price is not USD (${priceInfo.currency}). Attempting hardcoded conversion for ${priceInfo.value}.`);
      const convertedValue = convertCurrencyHardcoded(priceInfo.value, priceInfo.currency, 'USD');
      if (convertedValue !== null) {
        console.log(`[Honey Barrel BG] Final Converted Price (Hardcoded): ${convertedValue.toFixed(2)} USD (Original: ${priceInfo.value.toFixed(2)} ${priceInfo.currency})`);
        // TODO: Decide how to use/store this converted price
      } else {
        console.log(`[Honey Barrel BG] Hardcoded conversion failed or not supported for ${bottleName}.`);
      }
    } else if (priceInfo) {
      console.log(`[Honey Barrel BG] Price already in USD or currency missing: ${priceInfo.value?.toFixed(2)} ${priceInfo.currency || 'N/A'}`);
      // TODO: Decide how to use/store this price
    } else {
       console.log(`[Honey Barrel BG] No valid price info received for ${bottleName}.`);
    }

    // IMPORTANT: This part of the listener remains synchronous for BOTTLE_INFO
    console.log('[Honey Barrel BG] Finished processing BOTTLE_INFO (synchronous).');
    return false; // Do not keep the message channel open

  } else if (request.type === 'SEARCH_BOTTLE') {
    console.log('[Honey Barrel BG] Processing SEARCH_BOTTLE request from popup.');
    const bottleName = request.bottleName; // Get bottleName from the request

    if (!bottleName) {
        console.warn('[Honey Barrel BG] SEARCH_BOTTLE request received without bottleName.');
        sendResponse({ matches: [] }); // Send empty array if no name provided
        return false; // No async operation needed here, sendResponse was synchronous
    }

    // Use an IIFE (Immediately Invoked Function Expression) to handle the async operation
    // This allows the main listener function to return `true` immediately.
    (async () => {
      console.log(`[Honey Barrel BG] Calling async searchBaxusListings for: ${bottleName}`);
      const results = await searchBaxusListings(bottleName); // Call the updated async function
      console.log('[Honey Barrel BG] Sending search results back to popup:', results);
      // Send the extracted _source objects
      sendResponse({ matches: results });
    })();

    // IMPORTANT: Return true to indicate an asynchronous response will be sent
    console.log('[Honey Barrel BG] Returned true to keep message channel open for async SEARCH_BOTTLE response.');
    return true;

  } else {
    console.log(`[Honey Barrel BG] Received unhandled message type: ${request.type}. Ignoring.`);
    // Optional: return false explicitly if not handling other types asynchronously
    return false;
  }
});

console.log('[Honey Barrel BG] Service worker started and message listener added.');