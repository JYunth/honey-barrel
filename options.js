// Function to save options to chrome.storage
function save_options() {
  const thresholdInput = document.getElementById('threshold');
  const status = document.getElementById('status');
  let threshold = parseFloat(thresholdInput.value);

  // Validate the threshold
  if (isNaN(threshold) || threshold < 0.1 || threshold > 1.0) {
    status.textContent = 'Error: Threshold must be between 0.1 and 1.0.';
    // Optionally, reset to a valid value or the previously saved one
    // For now, just show error and don't save
    return;
  }

  // Round to one decimal place to match step="0.1"
  threshold = Math.round(threshold * 10) / 10;
  thresholdInput.value = threshold; // Update input field with rounded value

  chrome.storage.sync.set({
    similarityThreshold: threshold
  }, function() {
    // Update status to let user know options were saved.
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 1500); // Clear status after 1.5 seconds
  });
}

// Function to restore options from chrome.storage
function restore_options() {
  // Use default value threshold = 0.6
  chrome.storage.sync.get({
    similarityThreshold: 0.6 // Default value
  }, function(items) {
    document.getElementById('threshold').value = items.similarityThreshold;
  });
}

// Add event listeners once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);