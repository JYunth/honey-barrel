document.addEventListener('DOMContentLoaded', function() {
  const matchesListElement = document.getElementById('matchesList');

  if (!matchesListElement) {
    console.error("Could not find #matchesList element in popup.html");
    return; // Stop if the essential element is missing
  }

  console.log("[Honey Barrel Popup] Requesting matches from background script...");
  matchesListElement.textContent = 'Loading matches...'; // Initial state

  // Send a message directly to the background script
  chrome.runtime.sendMessage({ type: 'SEARCH_BOTTLE' }, function(response) {
    if (chrome.runtime.lastError) {
      console.error("Error sending/receiving message from background:", chrome.runtime.lastError.message);
      matchesListElement.textContent = 'Error loading matches. Is the background script running?';
      return;
    }

    console.log("[Honey Barrel Popup] Received response from background:", response);

    // Clear loading message
    matchesListElement.innerHTML = ''; // Use innerHTML to clear content

    if (response && response.matches && Array.isArray(response.matches)) {
      const matches = response.matches;

      if (matches.length > 0) {
        console.log(`[Honey Barrel Popup] Displaying ${matches.length} matches.`);
        const list = document.createElement('ul');
        matches.forEach(match => {
          const listItem = document.createElement('li');
          // Display name and price (ensure price is formatted)
          const priceString = typeof match.price === 'number' ? `$${match.price.toFixed(2)}` : 'Price N/A';
          listItem.textContent = `${match.name} - ${priceString}`;
          list.appendChild(listItem);
        });
        matchesListElement.appendChild(list);
      } else {
        console.log("[Honey Barrel Popup] No matches found.");
        matchesListElement.textContent = 'No matches found.';
      }
    } else {
      console.error("[Honey Barrel Popup] Invalid response format received from background:", response);
      matchesListElement.textContent = 'Failed to get matches (invalid response).';
    }
  });
});