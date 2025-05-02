# Honey Barrel - Chrome Extension

## Description

Honey Barrel is a Chrome extension designed for whiskey and spirit enthusiasts. It automatically scans supported retail websites you visit, identifies bottles, and fetches pricing information from our Honey Barrel API to help you find comparable prices and potentially better deals across different vendors.

## Use Case

Imagine browsing your favorite online liquor store. With Honey Barrel installed, the extension automatically detects the bottles listed on the page. For each bottle, it queries the Honey Barrel API to find matching entries and displays the prices found on other supported websites, allowing for quick and easy price comparison without manually searching each site.

## How It Works

1.  **Browse:** Navigate to a supported online spirit retailer website.
2.  **Automatic Detection:** The extension's content script identifies potential bottle names and prices on the page.
3.  **API Query:** For each identified bottle, the extension sends the name to the Honey Barrel API.
4.  **Matching & Comparison:** The API uses a similarity algorithm (Sørensen-Dice) to find matching bottles in its database, aggregating prices from various supported vendors.
5.  **Display Results:** The extension displays the comparison prices directly in the popup, showing you where else the bottle is available and for how much.

## Key Features ✨

*   **🚀 Exhaustive Multi-Site Support:** Never miss a deal! Honey Barrel automatically scans and compares prices across a growing list of popular spirit retailers, including `wine.com`, `spiritory.com`, `caskcartel.com`, `whisky.auction`, `caskers.com`, and `baxus.co`. Enjoy the ultimate convenience of centralized price comparison without lifting a finger.
*   **🌍 Multi-Currency Handling:** Shop globally with ease! The extension intelligently extracts prices listed in various currencies (USD, EUR, GBP). While currently using fixed conversion rates for comparison, this feature simplifies evaluating international offers. (Future updates aim to use real-time rates).
*   **🧠 Efficient Similarity Matching:** Smart matching at its core! We utilize the robust Sørensen-Dice similarity algorithm to intelligently match bottle names, even when faced with slight variations in spelling, abbreviations, or descriptions. Find the right bottle, faster.
*   **🔧 Configurable Precision:** Tailor the matching to your needs! Access the dedicated Options page to adjust the similarity threshold. Fine-tune how strictly the extension matches names, giving you control over the balance between finding more potential matches and ensuring higher accuracy.
*   **⚡ Optimized Performance:** Blazing fast lookups! Honey Barrel employs an intelligent caching mechanism for API results. Prices for bottles you've viewed recently are stored locally, dramatically speeding up subsequent lookups and minimizing redundant API calls, saving you time and resources.

## Installation Guide

1.  Download the extension files (or clone the repository).
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable "Developer mode" using the toggle switch in the top-right corner.
4.  Click the "Load unpacked" button.
5.  Select the directory containing the extension's files (`manifest.json`, etc.).
6.  The Honey Barrel icon should appear in your Chrome toolbar.

## Supported Websites

Honey Barrel currently supports price extraction from the following websites, spanning spirit sellers and p2p marketplaces across the US, UK and EU:

| Site Name                  | URL Example                     | Notes                               |
| -------------------------- | ------------------------------- | ----------------------------------- |
| wine.com                   | `https://www.wine.com`          |                                     |
| spiritory.com              | `https://spiritory.com`         |                                     |
| caskcartel.com             | `https://caskcartel.com`        |                                     |
| whisky.auction             | `https://whisky.auction`        |                                     |
| caskers.com                | `https://www.caskers.com`       |                                     |
| baxus.co                   | `https://www.baxus.co`          |                                     |
| uptownspirits.com          | `https://uptownspirits.com`     | Handles INR (₹)                     |
| qualityliquorstore.com     | `https://qualityliquorstore.com`|                                     |
| reservebar.com             | `https://www.reservebar.com`    |                                     |
| eu.flaviar.com             | `https://eu.flaviar.com`        | Handles EUR (€)                     |
| totalwine.com              | `https://www.totalwine.com`     |                                     |
| bevmo.com                  | `https://www.bevmo.com`         | May extract regular (<s>) price     |
| klwines.com                | `https://shop.klwines.com`      |                                     |
| astorwines.com             | `https://www.astorwines.com`    |                                     |
| masterofmalt.com           | `https://www.masterofmalt.com`  | Handles GBP (£)                     |
| thewhiskyexchange.com      | `https://www.thewhiskyexchange.com` | Handles GBP (£)                     |
| 365drinks.co.uk            | `https://www.365drinks.co.uk`   | Handles GBP (£)                     |
| threshers.co.uk            | `https://www.threshers.co.uk`   | Handles GBP (£)                     |
| majestic.co.uk             | `https://www.majestic.co.uk`    | Handles GBP (£)                     |
| laithwaites.com            | `https://www.laithwaites.com`   | Price selector might be generic     |
| whiskyauctioneer.com       | `https://whiskyauctioneer.com`  | Handles GBP (£)                     |
| scotchwhiskyauctions.com   | `https://www.scotchwhiskyauctions.com` | Handles GBP (£), "Winning bid:" |
| just-whisky.co.uk          | `https://www.just-whisky.co.uk` | Handles GBP (£)                     |
| thegrandwhiskyauction.com  | `https://www.thegrandwhiskyauction.com` | Handles "US$" prefix              |
| htfw.com                   | `https://www.htfw.com`          | Handles GBP (£)                     |

*(More coming soon!)*

## Technical Peek

*   **Frontend:** HTML, CSS, JavaScript
*   **Background Script:** Manages API calls, caching, and core logic.
*   **Content Script:** Injects into web pages to extract bottle information.
*   **Similarity Algorithm:** Sørensen-Dice coefficient for name matching.

## Disclaimer

Honey Barrel relies on data scraped from public websites and a central API. Prices and availability are subject to change and may not always be 100% accurate or real-time. The extension is intended for informational purposes to aid comparison. Always verify prices directly on the retailer's website before making a purchase. Fixed currency conversion rates are used for estimation.