function normalizeBottleName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\b(the|limited|edition|release|single|barrel|cask|strength|proof|year|old|aged|distillery|winery|vineyard|chateau|domaine)\b/g, '') // Remove common terms
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}
// Popup script for Honey Barrel extension

// Function to create a match item element with enhanced details
function createMatchItem(match, currentPrice) {
    const matchItem = document.createElement('div');
    matchItem.className = 'match-item';

    // Removed blurhash background logic

    // Removed main content container div - elements are added directly to matchItem now

    // Create the header with image and details
    const headerDiv = document.createElement('div');
    headerDiv.className = 'match-header';

    // Add image if available
    if (match.imageUrl) {
      const img = document.createElement('img');
      img.className = 'match-image';
      img.src = match.imageUrl;
      img.alt = match.name;
      img.onerror = function() {
        this.onerror = null;
        this.src = 'images/bottle-placeholder.png'; // Fallback image
      };
      headerDiv.appendChild(img);
    }

    // Add details
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'match-details';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'match-name';
    nameDiv.textContent = match.name;
    detailsDiv.appendChild(nameDiv);

    if (match.spiritType) {
      const typeDiv = document.createElement('div');
      typeDiv.className = 'match-type';
      typeDiv.textContent = match.spiritType;
      detailsDiv.appendChild(typeDiv);
    }

    // Removed region logic

    headerDiv.appendChild(detailsDiv);
    matchItem.appendChild(headerDiv); // Add header directly to matchItem

    // Create price comparison
    const priceCompareDiv = document.createElement('div');
    priceCompareDiv.className = 'price-compare';

    // Current price
    const currentPriceDiv = document.createElement('div');
    currentPriceDiv.className = 'price-compare-item';
    currentPriceDiv.innerHTML = `
      <div class="price-label">Current Site</div>
      <div class="price-value">$${currentPrice.toFixed(2)}</div>
    `;
    priceCompareDiv.appendChild(currentPriceDiv);

    // BAXUS price
    const baxusPriceDiv = document.createElement('div');
    baxusPriceDiv.className = 'price-compare-item';
    baxusPriceDiv.innerHTML = `
      <div class="price-label">on BAXUS</div>
      <div class="price-value">$${match.price.toFixed(2)}</div>
    `;
    priceCompareDiv.appendChild(baxusPriceDiv);

    matchItem.appendChild(priceCompareDiv); // Add price compare directly to matchItem

    // Calculate savings
    const priceDiff = currentPrice - match.price; // Correct calculation: Current - BAXUS

    // Add link to BAXUS (moved before savings so savings appears above it)
    const viewBtn = document.createElement('a');
    viewBtn.href = `https://baxus.co/asset/${match.id}`;
    viewBtn.className = 'view-btn';
    viewBtn.target = '_blank';
    // Use span for arrow as defined in the updated CSS
    viewBtn.innerHTML = `View on BAXUS <span>→</span>`;
    // We will append this later, after potentially adding the savings div

    // Display savings (only if savings exist) - Placed between price compare and button
    // Restore original logic: Display savings only if they exist
    if (priceDiff > 0) { // Only show if current price is higher (savings on BAXUS)
      const savingsDiv = document.createElement('div');
      savingsDiv.className = 'savings';
      // Keep user's updated format (no arrow, with exclamation)
      savingsDiv.innerHTML = `Save $${priceDiff.toFixed(2)} on BAXUS!`;
      matchItem.appendChild(savingsDiv); // Add savings div before the button
    }
    // Removed else if (priceDiff === 0) and else blocks

    // Now append the button
    matchItem.appendChild(viewBtn); // Add button directly to matchItem

    // Removed duplicate button creation below
    // Removed appending contentDiv
    return matchItem;
  }

  // Function to show "no matches" content
  function showNoMatches() {
    const matchesContainer = document.querySelector('.matches');

    matchesContainer.innerHTML = `
      <div class="no-matches">
        <p>No matching bottles found on BAXUS marketplace</p>
      </div>
    `;
    // Removed SVG from no-matches
  }

  // Function to update popup status
  function updateStatus(message, type = 'loading') {
    const statusElement = document.querySelector('.status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
  }

  // Function to update popup content
  function updatePopupContent(matches, currentPrice) {
    const matchesContainer = document.querySelector('.matches');

    // Removed hiding loading indicator as it doesn't exist

    if (!matches || matches.length === 0) {
      updateStatus('No matches found', 'error'); // Keep error status text
      showNoMatches();
      return;
    }

    updateStatus(`Found ${matches.length} matching bottle${matches.length > 1 ? 's' : ''}`, 'success');
    matchesContainer.innerHTML = '';

    // Add each match with a slight delay for animation
    matches.forEach((match, index) => {
      setTimeout(() => {
        matchesContainer.appendChild(createMatchItem(match, currentPrice));
      }, index * 100);
    });
  }

  // Function to handle errors
  function handleError(message) {
    updateStatus(message || 'An error occurred', 'error'); // Keep error status text
    // Removed hiding loading indicator as it doesn't exist
    showNoMatches();
  }

  // Execute when popup loads
  document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup opened");
    updateStatus('Checking current page...', 'loading');

    // Query the active tab to get current bottle information
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const activeTab = tabs[0];
      console.log("Active tab:", activeTab.url);

      if (!activeTab || !activeTab.id) { // Added check for activeTab.id
        handleError('Cannot access current tab or tab ID');
        return;
      }

      // Request latest bottle info from background script
      console.log(`Requesting latest info for tab ${activeTab.id} from background script...`);
      chrome.runtime.sendMessage({ type: 'GET_LATEST_BOTTLE_INFO', tabId: activeTab.id }, response => {
          if (chrome.runtime.lastError) {
              console.error("Error requesting info from background:", chrome.runtime.lastError.message);
              handleError(`Error getting page info: ${chrome.runtime.lastError.message}`);
              return;
          }

          console.log("Response from background script (GET_LATEST_BOTTLE_INFO):", response);

          if (!response || !response.bottleInfo || !response.bottleInfo.name || !response.bottleInfo.priceInfo) {
              handleError('No bottle detected or info not ready yet.');
              return;
          }

          const { name: bottleName, priceInfo } = response.bottleInfo;
          const currentPrice = priceInfo.value; // Assuming priceInfo has { value, currency }

          console.log(`Raw bottleName from background script: "${bottleName}"`);
          const normalizedBottleName = normalizeBottleName(bottleName);
          updateStatus(`Trying to find: ${bottleName}`, 'loading');
          console.log(`Normalized name for search: "${normalizedBottleName}"`);

          // Ensure normalized name is not empty before sending
          if (!normalizedBottleName) {
              console.warn("Normalized bottle name is empty. Aborting search.");
              handleError("Could not determine a valid name for search.");
              return;
          }

          // Search for matches using the background script
          chrome.runtime.sendMessage(
              { type: 'SEARCH_BOTTLE', normalizedName: normalizedBottleName, tabId: activeTab.id },
              searchResponse => {
                  if (chrome.runtime.lastError) {
                      console.error("Error sending/receiving SEARCH_BOTTLE:", chrome.runtime.lastError.message);
                      handleError(`Error searching: ${chrome.runtime.lastError.message}`);
                      return;
                  }

                  console.log("Search response:", searchResponse);
                  if (searchResponse && searchResponse.matches) {
                      // Pass the numeric price value to updatePopupContent
                      updatePopupContent(searchResponse.matches, currentPrice);
                  } else {
                      const errorMsg = searchResponse && searchResponse.error ? searchResponse.error : 'Failed to search bottles';
                      handleError(errorMsg);
                  }
              }
          );
      });
    });
  });