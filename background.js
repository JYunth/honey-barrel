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

// Synchronous listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Honey Barrel BG] Message listener triggered.');

  if (request.type === 'BOTTLE_INFO') {
    console.log('[Honey Barrel BG] Message type is BOTTLE_INFO.');
    const { name, priceInfo, sourceSite } = request.payload;
    console.log(`[Honey Barrel BG] Received BOTTLE_INFO from ${sourceSite || 'unknown site'}:`, request.payload);

    if (priceInfo && priceInfo.currency && priceInfo.currency !== 'USD') {
      console.log(`[Honey Barrel BG] Price is not USD (${priceInfo.currency}). Attempting hardcoded conversion for ${priceInfo.value}.`);
      const convertedValue = convertCurrencyHardcoded(priceInfo.value, priceInfo.currency, 'USD');

      if (convertedValue !== null) {
        console.log(`[Honey Barrel BG] Final Converted Price (Hardcoded): ${convertedValue.toFixed(2)} USD (Original: ${priceInfo.value.toFixed(2)} ${priceInfo.currency})`);
        // TODO: Store or display the converted price
      } else {
        console.log(`[Honey Barrel BG] Hardcoded conversion failed or not supported for ${name}.`);
      }
    } else if (priceInfo) {
      console.log(`[Honey Barrel BG] Price already in USD or currency missing: ${priceInfo.value?.toFixed(2)} ${priceInfo.currency || 'N/A'}`);
      // TODO: Store or display the USD price
    } else {
       console.log(`[Honey Barrel BG] No valid price info received for ${name}.`);
    }
  } else {
      console.log(`[Honey Barrel BG] Received message of type: ${request.type}. Ignoring.`);
  }

  // Return false as this is now a synchronous listener
  console.log('[Honey Barrel BG] Listener finished processing (synchronous).');
  return false;
});

console.log('[Honey Barrel BG] Service worker started and synchronous listener added.');