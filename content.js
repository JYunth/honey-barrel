/**
 * Formats a raw price string (e.g., "6997", "$69.97", "Price: 69.97") into a standard format (e.g., "$69.97").
 * @param {string} rawPrice - The raw price string to format.
 * @returns {string|null} The formatted price string or null if formatting fails.
 */
function formatPrice(rawPrice) {
  if (!rawPrice) return null;

  // Remove non-digit characters except for a potential decimal point
  const cleanedPrice = rawPrice.replace(/[^0-9.]/g, '');
  const priceNum = parseFloat(cleanedPrice);

  if (isNaN(priceNum)) return null;

  // Format to 2 decimal places
  // Check if the original string contained a decimal to decide if we need to divide by 100
  // This handles cases like "6997" (needs division) vs "69.97" (doesn't)
  let finalPrice;
  if (cleanedPrice.includes('.')) {
      finalPrice = priceNum;
  } else {
      // Assuming the number represents cents if no decimal is present
      finalPrice = priceNum / 100;
  }

  return `$${finalPrice.toFixed(2)}`;
}

/**
 * Extracts wine information (name and price) from wine.com product pages.
 */
function extractWineComInfo() {
  console.log("Honey Barrel: Attempting to extract info from wine.com...");

  const titleSelector = '.pipName';
  const priceSelector = '.productPrice';

  const nameElement = document.querySelector(titleSelector);
  const priceElement = document.querySelector(priceSelector);

  const name = nameElement ? nameElement.textContent.trim() : null;
  const rawPrice = priceElement ? priceElement.textContent.trim() : null;
  const formattedPrice = formatPrice(rawPrice);

  if (name) {
    console.log(`Honey Barrel: Found Name - ${name}`);
  } else {
    console.log(`Honey Barrel: Name element (${titleSelector}) not found.`);
  }

  if (formattedPrice) {
    console.log(`Honey Barrel: Found Price - ${formattedPrice}`);
  } else if (rawPrice) {
    console.log(`Honey Barrel: Found Price (unformatted) - ${rawPrice}`);
  } else {
    console.log(`Honey Barrel: Price element (${priceSelector}) not found.`);
  }
}

// Run the extraction function when the content script loads
extractWineComInfo();