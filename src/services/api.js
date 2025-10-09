// API service for backend communication

// In production, use relative path (nginx proxies /api to backend)
// In development, use localhost:5001
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Debounce timer for saves
let saveTimer = null;
const SAVE_DELAY = 1000; // Wait 1 second after last change

/**
 * Save complete application state to backend (debounced)
 */
export async function saveData(data) {
  return new Promise((resolve, reject) => {
    // Clear existing timer
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    // Set new timer
    saveTimer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Save failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✓ Data saved to server:', result.timestamp);
        resolve(result);
      } catch (error) {
        console.error('✗ Error saving data:', error);
        reject(error);
      }
    }, SAVE_DELAY);
  });
}

/**
 * Load complete application state from backend
 */
export async function loadData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/load`);

    if (!response.ok) {
      throw new Error(`Load failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✓ Data loaded from server');
    return data;
  } catch (error) {
    console.error('✗ Error loading data:', error);
    throw error;
  }
}

/**
 * Export data (for manual download)
 */
export async function exportData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/export`);

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('✗ Error exporting data:', error);
    throw error;
  }
}

/**
 * Health check
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return await response.json();
  } catch (error) {
    console.error('✗ Backend health check failed:', error);
    return { status: 'unhealthy', error: error.message };
  }
}
