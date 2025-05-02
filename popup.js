document.addEventListener('DOMContentLoaded', function() {
  const bottleNameElement = document.getElementById('bottleName');
  const bottlePriceElement = document.getElementById('bottlePrice');

  // Query the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (chrome.runtime.lastError) {
      console.error("Error querying tabs:", chrome.runtime.lastError.message);
      bottleNameElement.textContent = 'Error loading data.';
      return;
    }

    if (tabs.length === 0) {
        console.error("No active tab found.");
        bottleNameElement.textContent = 'Could not find active tab.';
        return;
    }

    const activeTab = tabs[0];

    // Check if the tab has a valid ID before sending a message
    if (activeTab.id === undefined || activeTab.id === chrome.tabs.TAB_ID_NONE) {
        console.error("Active tab has no valid ID:", activeTab);
        bottleNameElement.textContent = 'Cannot communicate with this tab.';
        return;
    }


    // Send a message to the content script of the active tab
    chrome.tabs.sendMessage(activeTab.id, { type: 'GET_BOTTLE_INFO' }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError.message);
        // Display a user-friendly message if the content script isn't available (e.g., on a page where it doesn't run)
        if (chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
             bottleNameElement.textContent = 'No bottle info found on this page.';
        } else {
             bottleNameElement.textContent = 'Error retrieving data.';
        }
        bottlePriceElement.textContent = ''; // Clear price field on error
        return;
      }

      // Handle the response from the content script
      if (response && response.bottleName) {
        bottleNameElement.textContent = response.bottleName;
        bottlePriceElement.textContent = response.bottlePrice || 'Price not found';
      } else {
        bottleNameElement.textContent = 'No bottle info found.';
        bottlePriceElement.textContent = '';
      }
    });
  });
});