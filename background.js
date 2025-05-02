const SIMILARITY_THRESHOLD = 0.6; // Threshold for considering items similar enough

function normalizeBottleName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\b(the|limited|edition|release|single|barrel|cask|strength|proof|year|old|aged|distillery|winery|vineyard|chateau|domaine)\b/g, '') // Remove common terms
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}
function getStringBigrams(str) {
  if (!str || str.length < 2) {
    return new Set();
  }
  const bigrams = new Set();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.substring(i, i + 2));
  }
  return bigrams;
}

function calculateSimilarity(str1, str2) {
  // Handle edge cases: empty strings or strings too short for bigrams
  if (!str1 || !str2 || str1.length < 2 || str2.length < 2) {
    console.log(`[Honey Barrel BG] Similarity edge case: One or both strings too short ("${str1}", "${str2}"). Returning 0.`);
    return 0;
  }

  const bigrams1 = getStringBigrams(str1);
  const bigrams2 = getStringBigrams(str2);

  // Handle edge case: No bigrams generated (e.g., single character strings after normalization)
  if (bigrams1.size === 0 || bigrams2.size === 0) {
     console.log(`[Honey Barrel BG] Similarity edge case: Zero bigrams for one or both strings ("${str1}", "${str2}"). Returning 0.`);
     return 0;
  }

  let intersectionSize = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersectionSize++;
    }
  }

  const diceCoefficient = (2 * intersectionSize) / (bigrams1.size + bigrams2.size);
  console.log(`[Honey Barrel BG] Calculated Dice Similarity for "${str1}" vs "${str2}": ${diceCoefficient.toFixed(3)} (Intersection: ${intersectionSize}, Set1: ${bigrams1.size}, Set2: ${bigrams2.size})`);
  return diceCoefficient;
}

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
async function searchBaxusListings(normalizedQueryName) {
  // TODO: Incorporate normalizedQueryName into the search query later.
  // For now, we fetch a general list.
  console.log(`[Honey Barrel BG] Searching Baxus API for listings related to normalized query: "${normalizedQueryName}"`);
  const apiUrl = 'https://services.baxus.co/api/search/listings?from=0&size=1500&listed=true';

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
        const rawListings = data.map(item => item._source).filter(Boolean); // Extract _source and filter out any nulls
        console.log(`[Honey Barrel BG] Extracted ${rawListings.length} raw listings from API response.`);

        // --- Start Commit 8: Similarity Calculation, Filtering, and Sorting ---
        console.log(`[Honey Barrel BG] Calculating similarity, filtering (threshold: ${SIMILARITY_THRESHOLD}), and sorting API results against query: "${normalizedQueryName}"`);

        const processedListings = rawListings.map(item => {
          const apiItemName = item?.name;
          if (!apiItemName) {
            console.log('[Honey Barrel BG] Skipping item with missing name:', item);
            return null; // Mark for removal later
          }

          const normalizedApiItemName = normalizeBottleName(apiItemName);
          const similarity = calculateSimilarity(normalizedQueryName, normalizedApiItemName);

          // Add similarity score to the item object
          item.similarity = similarity;

          console.log(`[Honey Barrel BG] Similarity for "${normalizedApiItemName}" (Original: "${apiItemName}"): ${similarity.toFixed(3)}`);

          return item; // Return the item with the added similarity score
        }).filter(item => {
            // Filter out items marked as null (missing name) AND items below the threshold
            if (item === null) return false;
            const passesThreshold = item.similarity >= SIMILARITY_THRESHOLD;
            console.log(`[Honey Barrel BG] Item "${item.name}" (Similarity: ${item.similarity.toFixed(3)}) ${passesThreshold ? 'PASSES' : 'FAILS'} threshold.`);
            return passesThreshold;
        });

        // Sort the filtered listings by similarity in descending order
        processedListings.sort((a, b) => b.similarity - a.similarity);

        console.log(`[Honey Barrel BG] Found ${processedListings.length} listings passing similarity threshold and sorted.`);
        // --- End Commit 8 ---

        // Return the filtered and sorted listings
        return processedListings;
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
    const normalizedName = request.normalizedName; // Expect normalizedName from the request

    if (!normalizedName) {
        console.warn('[Honey Barrel BG] SEARCH_BOTTLE request received without normalizedName.');
        sendResponse({ matches: [] }); // Send empty array if no name provided
        return false; // No async operation needed here, sendResponse was synchronous
    }

    // Use an IIFE (Immediately Invoked Function Expression) to handle the async operation
    // This allows the main listener function to return `true` immediately.
    (async () => {
      console.log(`[Honey Barrel BG] Calling async searchBaxusListings for normalized name: "${normalizedName}"`);
      const results = await searchBaxusListings(normalizedName); // Pass normalizedName
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