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
 * Placeholder function to simulate searching Baxus listings.
 * @param {string} bottleName - The name of the bottle to search for.
 * @returns {Array<object>} An array of dummy match objects.
 */
function searchBaxusListings(bottleName) {
  console.log(`[Honey Barrel BG] Searching Baxus (placeholder) for: ${bottleName}`);
  // TODO: Replace with actual API call in a later commit
  const dummyMatches = [
    { id: 'dummy1', name: 'Dummy Match 1 (Baxus)', price: 50.00 },
    { id: 'dummy2', name: 'Dummy Match 2 (Baxus)', price: 65.50 }
  ];
  console.log('[Honey Barrel BG] Returning dummy Baxus matches:', dummyMatches);
  return dummyMatches;
}

// Variable to store the results from the last content script message
let lastSearchedMatches = [];

// Combined listener for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`[Honey Barrel BG] Message listener triggered for type: ${request.type}`);

  if (request.type === 'BOTTLE_INFO') {
    console.log('[Honey Barrel BG] Processing BOTTLE_INFO from content script.');
    const bottleName = request.payload?.name;
    const sourceSite = request.payload?.sourceSite || 'unknown site';
    console.log(`[Honey Barrel BG] Received BOTTLE_INFO from ${sourceSite}:`, request.payload);

    if (bottleName) {
      // Call the search function (currently placeholder)
      lastSearchedMatches = searchBaxusListings(bottleName);
      console.log('[Honey Barrel BG] Stored dummy matches for potential popup request.');
    } else {
      console.warn('[Honey Barrel BG] No bottle name found in BOTTLE_INFO payload.');
      lastSearchedMatches = []; // Clear matches if no name
    }

    // Handle currency conversion if needed (keeping existing logic for now)
    const priceInfo = request.payload?.priceInfo;
    if (priceInfo && priceInfo.currency && priceInfo.currency !== 'USD') {
      console.log(`[Honey Barrel BG] Price is not USD (${priceInfo.currency}). Attempting hardcoded conversion for ${priceInfo.value}.`);
      const convertedValue = convertCurrencyHardcoded(priceInfo.value, priceInfo.currency, 'USD');
      if (convertedValue !== null) {
        console.log(`[Honey Barrel BG] Final Converted Price (Hardcoded): ${convertedValue.toFixed(2)} USD (Original: ${priceInfo.value.toFixed(2)} ${priceInfo.currency})`);
        // TODO: Decide how to use/store this converted price alongside matches
      } else {
        console.log(`[Honey Barrel BG] Hardcoded conversion failed or not supported for ${bottleName}.`);
      }
    } else if (priceInfo) {
      console.log(`[Honey Barrel BG] Price already in USD or currency missing: ${priceInfo.value?.toFixed(2)} ${priceInfo.currency || 'N/A'}`);
      // TODO: Decide how to use/store this price alongside matches
    } else {
       console.log(`[Honey Barrel BG] No valid price info received for ${bottleName}.`);
    }

    // IMPORTANT: This part of the listener remains synchronous for BOTTLE_INFO
    console.log('[Honey Barrel BG] Finished processing BOTTLE_INFO (synchronous).');
    return false; // Do not keep the message channel open

  } else if (request.type === 'SEARCH_BOTTLE') {
    console.log('[Honey Barrel BG] Processing SEARCH_BOTTLE request from popup.');
    // Respond with the stored matches
    console.log('[Honey Barrel BG] Sending stored matches to popup:', lastSearchedMatches);
    sendResponse({ matches: lastSearchedMatches });

    // IMPORTANT: Return true to indicate an asynchronous response
    console.log('[Honey Barrel BG] Sent matches to popup, keeping message channel open.');
    return true;

  } else {
    console.log(`[Honey Barrel BG] Received unhandled message type: ${request.type}. Ignoring.`);
    // Optional: return false explicitly if not handling other types asynchronously
    return false;
  }
});

console.log('[Honey Barrel BG] Service worker started and message listener added.');