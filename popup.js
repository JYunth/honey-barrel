document.addEventListener('DOMContentLoaded', function() {
  const matchesListElement = document.getElementById('matchesList');
  let currentPrice = null; // Variable to store the price from the current page

  if (!matchesListElement) {
    console.error("[Honey Barrel Popup] Could not find #matchesList element in popup.html");
    return; // Stop if the essential element is missing
  }

  matchesListElement.textContent = 'Getting bottle info from page...'; // Initial state

  // Step 1: Get bottle info from the content script
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (chrome.runtime.lastError) {
      console.error("[Honey Barrel Popup] Error querying tabs:", chrome.runtime.lastError.message);
      matchesListElement.textContent = 'Error contacting page.';
      return;
    }
    if (!tabs || tabs.length === 0) {
        console.error("[Honey Barrel Popup] No active tab found.");
        matchesListElement.textContent = 'Could not find active tab.';
        return;
    }

    const activeTabId = tabs[0].id;
    console.log(`[Honey Barrel Popup] Sending 'GET_BOTTLE_INFO' to tab ${activeTabId}`);

    chrome.tabs.sendMessage(activeTabId, { type: 'GET_BOTTLE_INFO' }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("[Honey Barrel Popup] Error receiving bottle info from content script:", chrome.runtime.lastError.message);
        matchesListElement.textContent = 'Could not get info from this page. Is it supported?';
        // Common error: "Could not establish connection. Receiving end does not exist."
        // This often means the content script hasn't been injected or the page is restricted (e.g., chrome:// pages)
        if (chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
             matchesListElement.textContent += ' (Content script not available on this page).';
        }
        return;
      }

      console.log("[Honey Barrel Popup] Received response from content script:", response);

      // Check for both name and normalizedName
      if (response && response.bottleInfo && response.bottleInfo.name && response.bottleInfo.normalizedName) {
        const bottleName = response.bottleInfo.name; // Keep original name for display
        const normalizedName = response.bottleInfo.normalizedName; // Get normalized name for search
        // Store the price if available
        currentPrice = response.bottleInfo.priceInfo?.value;
        console.log(`[Honey Barrel Popup] Got bottle name: "${bottleName}" (Normalized: "${normalizedName}"), Price: ${currentPrice ?? 'N/A'}. Requesting search from background...`);
        matchesListElement.textContent = `Searching Baxus for "${bottleName}"...`; // Display original name

        // Step 2: Send search request to the background script with the NORMALIZED name
        chrome.runtime.sendMessage({ type: 'SEARCH_BOTTLE', normalizedName: normalizedName }, function(searchResponse) {
          if (chrome.runtime.lastError) {
            console.error("[Honey Barrel Popup] Error receiving search results from background:", chrome.runtime.lastError.message);
            matchesListElement.textContent = 'Error getting search results.';
            return;
          }

          console.log("[Honey Barrel Popup] Received search response from background:", searchResponse);
          matchesListElement.innerHTML = ''; // Clear loading message

          if (searchResponse && searchResponse.matches && Array.isArray(searchResponse.matches)) {
            const matches = searchResponse.matches; // These are the _source objects

            if (matches.length > 0) {
              console.log(`[Honey Barrel Popup] Displaying ${matches.length} matches.`);
              // TODO: Display currentPrice alongside matches later
              const list = document.createElement('ul');
              matches.forEach(match => { // match is the _source object
                const listItem = document.createElement('li');
                // Access data directly from the _source object
                const name = match.name || 'Name N/A';
                const price = match.price;
                const priceString = typeof price === 'number' ? `$${price.toFixed(2)}` : 'Price N/A';
                listItem.textContent = `${name} - ${priceString}`;
                // You can add more details here later, e.g., match.imageUrl
                list.appendChild(listItem);
              });
              matchesListElement.appendChild(list);
            } else {
              console.log("[Honey Barrel Popup] No matches found from background search.");
              matchesListElement.textContent = `No Baxus matches found for "${bottleName}".`; // Display original name
            }
          } else {
            console.error("[Honey Barrel Popup] Invalid search response format received from background:", searchResponse);
            matchesListElement.textContent = 'Failed to get matches (invalid response).';
          }
        });

      } else {
        console.log("[Honey Barrel Popup] No valid bottle info received from content script.");
        matchesListElement.textContent = 'Could not identify a bottle on this page.';
      }
    });
  });
});