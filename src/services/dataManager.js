import { saveData, loadData } from './api';

// Debounce timer
let saveTimer = null;
const SAVE_DELAY = 1000; // Wait 1 second after last change before saving

/**
 * Save all application state to backend (debounced)
 */
export function saveAppState(schedule, people, roles, availability, settings) {
  // Clear existing timer
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  // Set new timer
  saveTimer = setTimeout(async () => {
    try {
      const appState = {
        schedule,
        people,
        roles,
        availability,
        settings,
        lastSaved: new Date().toISOString(),
      };

      await saveData(appState);
      console.log('✓ App state saved');
    } catch (error) {
      console.error('✗ Failed to save app state:', error);
      // Could show user notification here
    }
  }, SAVE_DELAY);
}

/**
 * Load all application state from backend
 */
export async function loadAppState() {
  try {
    const appState = await loadData();
    console.log('✓ App state loaded');
    return appState;
  } catch (error) {
    console.error('✗ Failed to load app state:', error);
    return {};
  }
}
