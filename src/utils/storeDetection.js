const storePatterns = {
  amazon: /amazon\./i,
  walmart: /walmart\./i,
  target: /target\./i,
  costco: /costco\./i,
  samsclub: /samsclub\./i,
  traderjoes: /traderjoes\./i,
  wholefoodsmarket: /wholefoodsmarket\./i,
};

const extractStoreNameFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Remove common TLDs and www
    let storeName = hostname
      .replace(/^www\./i, '')  // Remove www.
      .replace(/\.(com|net|org|co|store|shop|us|uk|ca|edu|gov|mil)$/i, '');  // Remove TLD
    
    // Split by dots and get the main domain part
    storeName = storeName.split('.')[0];
    
    // Replace hyphens with spaces and clean up
    storeName = storeName
      .replace(/-/g, ' ')  // Replace hyphens with spaces
      .replace(/[^a-z0-9\s]/g, '')  // Remove special characters
      .trim();
    
    // Capitalize first letter of each word
    storeName = storeName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return storeName;
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
};

export const detectStoreFromUrl = (url) => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check predefined patterns first
    for (const [store, pattern] of Object.entries(storePatterns)) {
      if (pattern.test(hostname)) {
        return store;
      }
    }
    
    // For unknown stores, extract the name from URL
    const extractedName = extractStoreNameFromUrl(url);
    return extractedName || 'other';
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
};

export const getStoreName = (storeKey) => {
  const storeNames = {
    amazon: 'Amazon',
    walmart: 'Walmart',
    target: 'Target',
    costco: 'Costco',
    samsclub: "Sam's Club",
    traderjoes: "Trader Joe's",
    wholefoodsmarket: 'Whole Foods Market'
  };
  
  // If it's a predefined store, return its formatted name
  if (storeNames[storeKey]) {
    return storeNames[storeKey];
  }
  
  // If it's not a predefined store and not 'other', return the store key as is
  // since it will be the extracted and formatted store name
  return storeKey === 'other' ? 'Unknown Store' : storeKey;
}; 