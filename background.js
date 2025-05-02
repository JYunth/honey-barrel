// Default threshold if not set in storage
const DEFAULT_SIMILARITY_THRESHOLD = 0.6;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

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
 * Generates a set of bigrams (character pairs) from a string.
 * Used for Dice coefficient similarity calculation.
 * @param {string} str - The input string.
 * @returns {Set<string>} A set containing the bigrams of the string.
 */
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

/**
 * Calculates the Dice coefficient similarity between two strings based on their bigrams.
 * @param {string} str1 - The first string (normalized).
 * @param {string} str2 - The second string (normalized).
 * @returns {number} The Dice coefficient, a value between 0 (no similarity) and 1 (identical).
 */
function calculateSimilarity(str1, str2) {
  // Handle edge cases: empty strings or strings too short for bigrams
  if (!str1 || !str2 || str1.length < 2 || str2.length < 2) {
    // console.log(`[Honey Barrel BG] Similarity edge case: One or both strings too short ("${str1}", "${str2}"). Returning 0.`); // Debug log removed
    return 0;
  }

  const bigrams1 = getStringBigrams(str1);
  const bigrams2 = getStringBigrams(str2);

  // Handle edge case: No bigrams generated (e.g., single character strings after normalization)
  if (bigrams1.size === 0 || bigrams2.size === 0) {
     // console.log(`[Honey Barrel BG] Similarity edge case: Zero bigrams for one or both strings ("${str1}", "${str2}"). Returning 0.`); // Debug log removed
     return 0;
  }

  let intersectionSize = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersectionSize++;
    }
  }

  const diceCoefficient = (2 * intersectionSize) / (bigrams1.size + bigrams2.size);
  // console.log(`[Honey Barrel BG] Calculated Dice Similarity for "${str1}" vs "${str2}": ${diceCoefficient.toFixed(3)} (Intersection: ${intersectionSize}, Set1: ${bigrams1.size}, Set2: ${bigrams2.size})`); // Debug log removed
  return diceCoefficient;
}

// Hardcoded conversion rate (Update this value as needed)
// TODO: Get latest rate from user or find a more dynamic solution later.
const EUR_TO_USD_RATE = 1.14; // Example: 1 EUR = 1.14 USD
const GBP_TO_USD_RATE = 1.33; // Example: 1 GBP = 1.33 USD
const INR_TO_USD_RATE = 0.01136; // Updated: 1 INR = 1/88 USD approx

/**
 * Converts an amount from EUR or GBP to USD using hardcoded rates.
 * Other conversions are not supported in this simplified version.
 * @param {number} amount - The amount to convert.
 * @param {string} fromCurrency - The 3-letter currency code to convert from (e.g., 'EUR', 'GBP').
 * @param {string} toCurrency - The 3-letter currency code to convert to (should be 'USD').
 * @returns {number|null} The converted amount in USD or null if conversion is not supported/fails.
 */
function convertCurrencyHardcoded(amount, fromCurrency, toCurrency) {
  // console.log(`[Honey Barrel BG] Attempting hardcoded conversion: ${amount} ${fromCurrency} to ${toCurrency}`); // Debug log removed

  if (fromCurrency === toCurrency) {
    // console.log('[Honey Barrel BG] Source and target currency are the same.'); // Debug log removed
    return amount;
  }

  if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    const convertedAmount = amount * EUR_TO_USD_RATE;
    // console.log(`[Honey Barrel BG] Hardcoded Conversion successful: ${amount} * ${EUR_TO_USD_RATE} = ${convertedAmount.toFixed(2)} ${toCurrency}`); // Debug log removed
    return convertedAmount;
  } else if (fromCurrency === 'GBP' && toCurrency === 'USD') {
    const convertedAmount = amount * GBP_TO_USD_RATE;
    // console.log(`[Honey Barrel BG] Hardcoded Conversion successful: ${amount} * ${GBP_TO_USD_RATE} = ${convertedAmount.toFixed(2)} ${toCurrency}`); // Debug log removed
    return convertedAmount;
  } else if (fromCurrency === 'INR' && toCurrency === 'USD') {
    const convertedAmount = amount * INR_TO_USD_RATE;
    // console.log(`[Honey Barrel BG] Hardcoded Conversion successful: ${amount} * ${INR_TO_USD_RATE} = ${convertedAmount.toFixed(2)} ${toCurrency}`); // Debug log removed
    return convertedAmount;
  } else {
    console.warn(`[Honey Barrel BG] Hardcoded conversion only supports EUR, GBP, INR to USD. Cannot convert ${fromCurrency} to ${toCurrency}.`);
    return null; // Indicate unsupported conversion
  }
}

/**
 * Fetches listings from the Baxus API, calculates similarity against the query,
 * filters based on a threshold, sorts by similarity, and caches the results.
 * @param {string} normalizedQueryName - The normalized name of the bottle to search for.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of filtered and sorted listing objects (_source property with added 'similarity' score) or an empty array on error.
 */
async function searchBaxusListings(normalizedQueryName) {
  // TODO: Incorporate normalizedQueryName into the search query later.
  // For now, we fetch a general list.
  console.log(`[Honey Barrel BG] Searching Baxus API for listings related to normalized query: "${normalizedQueryName}"`);
  // Note (Commit 15): Fetching 1500 results might be inefficient.
  // Consider fetching fewer initially and implementing pagination if needed later.
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
    // console.log('[Honey Barrel BG] Received Baxus API response (raw):', data); // Debug log removed

    // Extract the _source from each item in the response array.
    if (Array.isArray(data)) {
        const rawListings = data.map(item => item._source).filter(Boolean); // Extract _source and filter out any nulls
        // console.log(`[Honey Barrel BG] Extracted ${rawListings.length} raw listings from API response.`); // Debug log removed

        // --- Get similarity threshold from storage ---
        const storageData = await chrome.storage.sync.get({ similarityThreshold: DEFAULT_SIMILARITY_THRESHOLD });
        const threshold = storageData.similarityThreshold;
        console.log(`[Honey Barrel BG] Using similarity threshold from storage (or default): ${threshold}`);

        // --- Calculate similarity, filter, and sort ---
        // console.log(`[Honey Barrel BG] Calculating similarity, filtering (threshold: ${threshold}), and sorting API results against query: "${normalizedQueryName}"`); // Debug log removed

        const processedListings = rawListings.map(item => {
          const apiItemName = item?.name;
          if (!apiItemName) {
            // console.log('[Honey Barrel BG] Skipping item with missing name:', item); // Debug log removed
            return null; // Mark for removal later
          }

          const normalizedApiItemName = normalizeBottleName(apiItemName);
          const similarity = calculateSimilarity(normalizedQueryName, normalizedApiItemName);

          // Add similarity score to the item object
          item.similarity = similarity;

          // console.log(`[Honey Barrel BG] Similarity for "${normalizedApiItemName}" (Original: "${apiItemName}"): ${similarity.toFixed(3)}`); // Debug log removed

          return item; // Return the item with the added similarity score
        }).filter(item => {
            // Filter out items marked as null (missing name) AND items below the threshold
            if (item === null) return false;
            const passesThreshold = item.similarity >= threshold; // Use retrieved threshold
            // console.log(`[Honey Barrel BG] Item "${item.name}" (Similarity: ${item.similarity.toFixed(3)}) ${passesThreshold ? 'PASSES' : 'FAILS'} threshold (${threshold}).`); // Debug log removed
            return passesThreshold;
        });

        // Sort the filtered listings by similarity in descending order
        processedListings.sort((a, b) => b.similarity - a.similarity);

        console.log(`[Honey Barrel BG] Found ${processedListings.length} listings passing similarity threshold and sorted.`);

        // --- Cache the results ---
        if (processedListings.length > 0) {
          const cacheKey = 'baxus_search_' + normalizedQueryName;
          const dataToCache = { results: processedListings, timestamp: Date.now() };
          try {
            await chrome.storage.local.set({ [cacheKey]: dataToCache });
            console.log(`[Honey Barrel BG] Cached ${processedListings.length} results for key: ${cacheKey}`);
          } catch (error) {
            console.error(`[Honey Barrel BG] Error caching results for key ${cacheKey}:`, error);
          }
        }

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

/**
 * Retrieves matching Baxus listings for a normalized bottle name.
 * Checks local cache first; if cache is stale or missing, fetches from the API.
 * @param {string} normalizedName - The normalized bottle name to search for.
 * @returns {Promise<Array<object>>} A promise resolving to an array of matching listings.
 */
async function getMatches(normalizedName) {
  console.log(`[Honey Barrel BG] getMatches called for: "${normalizedName}"`);
  const cacheKey = 'baxus_search_' + normalizedName;

  // Check cache first
  try {
    const cachedData = await chrome.storage.local.get(cacheKey);
    if (cachedData[cacheKey] && (Date.now() - cachedData[cacheKey].timestamp < CACHE_DURATION_MS)) {
      console.log(`[Honey Barrel BG] getMatches: Using cached results for key: ${cacheKey}`);
      return cachedData[cacheKey].results; // Return cached matches
    } else {
      console.log(`[Honey Barrel BG] getMatches: No valid cache found for key: ${cacheKey}. Fetching fresh data.`);
    }
  } catch (error) {
    console.error(`[Honey Barrel BG] getMatches: Error retrieving cache for key ${cacheKey}:`, error);
    // Proceed to fetch fresh data if cache retrieval fails
  }

  // Fetch from API if cache miss or error
  console.log(`[Honey Barrel BG] getMatches: Calling searchBaxusListings for normalized name: "${normalizedName}"`);
  const results = await searchBaxusListings(normalizedName);
  return results; // Return fetched matches
}


// --- Storage for latest bottle info per tab ---
// Stores the most recently detected bottle information (name, price, normalized name)
// keyed by the tab ID where it was detected.
const latestBottleInfoByTab = {};

// --- Message Listener ---
// Handles messages from content scripts (BOTTLE_INFO) and the popup (GET_LATEST_BOTTLE_INFO, SEARCH_BOTTLE).
// NOTE: Uses explicit 'return true' for SEARCH_BOTTLE to indicate an asynchronous response.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`[Honey Barrel BG] Message received: Type=${request.type}, Sender Tab=${sender.tab?.id}`);

  switch (request.type) {
    case 'BOTTLE_INFO': {
      // Received bottle details from a content script. Store it.
      // console.log('[Honey Barrel BG] Processing BOTTLE_INFO from content script.'); // Debug log removed
      const tabId = sender.tab?.id;
      if (!tabId) {
          console.warn('[Honey Barrel BG] Received BOTTLE_INFO without sender tab ID. Cannot store.');
          return false; // Cannot process further
      }

      const payload = request.payload;
      // console.log(`[Honey Barrel BG] Received BOTTLE_INFO for tab ${tabId}:`, payload); // Debug log removed

      // Store the received payload (includes name, priceInfo, normalizedName)
      latestBottleInfoByTab[tabId] = payload;
      // console.log(`[Honey Barrel BG] Stored info for tab ${tabId}. Current store:`, latestBottleInfoByTab); // Debug log removed

      // Log potential currency conversion (actual conversion happens elsewhere if needed)
      const priceInfo = payload?.priceInfo;
      if (priceInfo && priceInfo.currency && priceInfo.currency !== 'USD') {
        // console.log(`[Honey Barrel BG] Price is not USD (${priceInfo.currency}). Attempting hardcoded conversion for ${priceInfo.value}.`); // Debug log removed
        const convertedValue = convertCurrencyHardcoded(priceInfo.value, priceInfo.currency, 'USD');
        if (convertedValue !== null) {
          console.log(`[Honey Barrel BG] Potential Converted Price (Hardcoded): ${convertedValue.toFixed(2)} USD`);
        } else {
          // Warning already logged in convertCurrencyHardcoded
        }
      }

      // No response needed back to content script for this message type.
      return false; // Do not keep the message channel open
    }

    case 'GET_LATEST_BOTTLE_INFO': {
      // Popup is requesting the stored bottle info for a specific tab.
      // console.log('[Honey Barrel BG] Processing GET_LATEST_BOTTLE_INFO request from popup.'); // Debug log removed
      const tabId = request.tabId;
      if (!tabId) {
          console.warn('[Honey Barrel BG] GET_LATEST_BOTTLE_INFO request received without tabId.');
          sendResponse({ bottleInfo: null });
          return; // Exit early
      }

      const storedInfo = latestBottleInfoByTab[tabId];
      // console.log(`[Honey Barrel BG] Retrieved stored info for tab ${tabId}:`, storedInfo); // Debug log removed
      sendResponse({ bottleInfo: storedInfo || null }); // Send stored info or null
      return; // Response sent synchronously.
    }

    case 'SEARCH_BOTTLE': {
      // Popup initiated a search for a bottle. Fetch matches (cache or API) and respond.
      // Also, send matches to the content script of the relevant tab to display the overlay.
      console.log('[Honey Barrel BG] Processing SEARCH_BOTTLE request from popup.');
      const normalizedName = request.normalizedName;
      const tabId = request.tabId; // Tab ID where the search was initiated

      if (!normalizedName) {
        console.warn('[Honey Barrel BG] SEARCH_BOTTLE request received without normalizedName.');
        sendResponse({ matches: [] });
        return false; // No async response needed, send empty results.
      }
      if (!tabId) {
          console.warn('[Honey Barrel BG] SEARCH_BOTTLE request received without tabId. Overlay cannot be displayed.');
          // Proceed with search, but overlay won't work.
      }

      // Use getMatches (which handles caching) and process the results asynchronously.
      getMatches(normalizedName).then(matches => {
          // console.log(`[Honey Barrel BG] SEARCH_BOTTLE: Got ${matches?.length ?? 0} matches back from getMatches.`); // Debug log removed

          // 1. Send response back to the popup
          // console.log('[Honey Barrel BG] SEARCH_BOTTLE: Sending matches response to popup.'); // Debug log removed
          sendResponse({ matches: matches });

          // 2. Send message to content script to display overlay (if matches exist and tabId is valid)
          if (matches && matches.length > 0 && tabId) {
              console.log(`[Honey Barrel BG] SEARCH_BOTTLE: Sending DISPLAY_OVERLAY message to content script in tab ${tabId}`);
              try {
                  chrome.tabs.sendMessage(
                      tabId,
                      { type: 'DISPLAY_OVERLAY', matches: matches }
                  );
                  // console.log(`[Honey Barrel BG] Attempted to send DISPLAY_OVERLAY to content script (tab ${tabId}).`); // Debug log removed
              } catch (error) {
                  // Log error if the content script isn't ready or tab closed.
                  console.warn(`[Honey Barrel BG] Error sending DISPLAY_OVERLAY message to content script (tab ${tabId}): ${error.message}`);
              }
          } else if (!tabId) {
              // Warning already logged above.
          } else {
              // console.log('[Honey Barrel BG] SEARCH_BOTTLE: No matches found or returned, not sending DISPLAY_OVERLAY message.'); // Debug log removed
          }
      }).catch(error => {
          // Handle potential errors from getMatches or the .then block
          console.error('[Honey Barrel BG] Error during SEARCH_BOTTLE processing:', error);
          // Attempt to send an error response back to popup
          try {
              sendResponse({ error: 'Failed to get matches due to background error.' });
          } catch (e) {
              // If sending the error response fails (e.g., popup closed), log it.
              console.error('[Honey Barrel BG] Failed to send error response to popup:', e);
          }
      });

      // Crucially, return true *immediately* to indicate we will send a response asynchronously.
      return true;
    }

    case 'REQUEST_INR_CONVERSION': {
      // Content script sent INR price info and needs it converted to USD.
      console.log('[Honey Barrel BG] Processing REQUEST_INR_CONVERSION from content script.');
      const tabId = sender.tab?.id;
      const payload = request.payload;

      if (!tabId || !payload || !payload.priceInfo || payload.priceInfo.currency !== 'INR') {
        console.warn('[Honey Barrel BG] Invalid REQUEST_INR_CONVERSION received:', request);
        return false; // Invalid request
      }

      const originalPriceInfo = payload.priceInfo;
      const convertedValue = convertCurrencyHardcoded(originalPriceInfo.value, 'INR', 'USD');

      if (convertedValue !== null) {
        const convertedPriceInfo = {
          value: parseFloat(convertedValue.toFixed(2)), // Ensure it's a number with 2 decimal places
          currency: 'USD'
        };

        // Send the converted info back to the specific content script tab
        console.log(`[Honey Barrel BG] Sending CONVERTED_PRICE_INFO back to tab ${tabId}`);
        try {
          chrome.tabs.sendMessage(tabId, {
            type: 'CONVERTED_PRICE_INFO',
            payload: {
              ...payload, // Include original name, normalizedName, sourceSite
              priceInfo: convertedPriceInfo // Overwrite with the converted price info
            }
          });
        } catch (error) {
          console.warn(`[Honey Barrel BG] Error sending CONVERTED_PRICE_INFO message to content script (tab ${tabId}): ${error.message}`);
        }
      } else {
        console.error(`[Honey Barrel BG] Failed to convert INR price for tab ${tabId}:`, originalPriceInfo);
        // Optionally send an error message back to content script? For now, just log.
      }
      return false; // Indicate synchronous handling (message sent via chrome.tabs.sendMessage)
    }

    default:
      // Handle unknown message types gracefully.
      console.log(`[Honey Barrel BG] Received unhandled message type: ${request.type}. Ignoring.`);
      return false; // No async response planned.
  }
});

console.log('[Honey Barrel BG] Service worker started and message listener added.');