/**
 * Saves the similarity threshold option to chrome.storage.sync.
 * Validates the input value to ensure it's between 0.1 and 1.0.
 * Updates the status message on the options page.
 */
function save_options() {
    const thresholdInput = document.getElementById('threshold');
    const status = document.getElementById('status');
    let threshold = parseFloat(thresholdInput.value);

    // Validate the threshold value
    if (isNaN(threshold) || threshold < 0.1 || threshold > 1.0) {
        status.textContent = 'Error: Threshold must be between 0.1 and 1.0.';
        status.className = 'status error'; // Add error class for styling
        // Clear error message after a delay
        setTimeout(() => {
            status.textContent = '';
            status.className = 'status';
        }, 3000);
        return; // Stop execution if invalid
    }

    // Round to one decimal place to align with the input step="0.1"
    threshold = Math.round(threshold * 10) / 10;
    thresholdInput.value = threshold; // Update the input field to show the rounded value

    // Save the validated and rounded threshold to storage
    chrome.storage.sync.set({
        similarityThreshold: threshold
    }, function() {
        // Check for errors during save
        if (chrome.runtime.lastError) {
            console.error("Error saving options:", chrome.runtime.lastError);
            status.textContent = 'Error saving options.';
            status.className = 'status error';
        } else {
            // Update status to confirm options were saved
            status.textContent = 'Options saved.';
            status.className = 'status success'; // Add success class
            // Clear status message after a short delay
            setTimeout(function() {
                status.textContent = '';
                status.className = 'status';
            }, 1500);
        }
    });
}

/**
 * Restores the saved similarity threshold option from chrome.storage.sync
 * and populates the input field on the options page when it loads.
 * Uses a default value if no setting is found in storage.
 */
function restore_options() {
    // Default value to use if 'similarityThreshold' is not found in storage
    const defaultValue = 0.6;
    chrome.storage.sync.get({
        similarityThreshold: defaultValue
    }, function(items) {
        // Check for errors during retrieval
        if (chrome.runtime.lastError) {
            console.error("Error restoring options:", chrome.runtime.lastError);
            // Optionally, display an error message to the user
            // const status = document.getElementById('status');
            // status.textContent = 'Error loading settings.';
            // status.className = 'status error';
        } else {
            // Set the value of the input field to the retrieved or default value
            const thresholdInput = document.getElementById('threshold');
            if (thresholdInput) {
                thresholdInput.value = items.similarityThreshold;
            } else {
                console.error("Could not find threshold input element.");
            }
        }
    });
}

// --- Event Listeners ---
// Restore saved options when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', restore_options);
// Save options when the 'Save' button is clicked.
const saveButton = document.getElementById('save');
if (saveButton) {
    saveButton.addEventListener('click', save_options);
} else {
    console.error("Could not find save button element.");
}