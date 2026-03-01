// IndexedDB Storage Implementation for Pitch Tracker
// Provides persistent storage that survives page refreshes and browser closes

const DB_NAME = 'PitchTrackerDB';
const DB_VERSION = 1;

class Storage {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('teams')) {
          db.createObjectStore('teams', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pitchers')) {
          db.createObjectStore('pitchers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('app_settings')) {
          db.createObjectStore('app_settings');
        }
        if (!db.objectStoreNames.contains('paused_sessions')) {
          db.createObjectStore('paused_sessions');
        }

        console.log('IndexedDB object stores created');
      };
    });
  }

  // Generic get operation
  async get(key, storeName) {
    if (!this.isInitialized) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error getting ${key} from ${storeName}:`, error);
        resolve(null);
      }
    });
  }

  // Generic set operation
  async set(key, value, storeName) {
    if (!this.isInitialized) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error setting ${key} in ${storeName}:`, error);
        reject(error);
      }
    });
  }

  // Generic delete operation
  async delete(key, storeName) {
    if (!this.isInitialized) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error deleting ${key} from ${storeName}:`, error);
        reject(error);
      }
    });
  }

  // Get all items from a store
  async getAll(storeName) {
    if (!this.isInitialized) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error getting all from ${storeName}:`, error);
        resolve([]);
      }
    });
  }

  // Save all items to a store (overwrites existing)
  async saveAll(storeName, items) {
    if (!this.isInitialized) await this.init();

    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        // Clear existing data
        await new Promise((res, rej) => {
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => res();
          clearRequest.onerror = () => rej(clearRequest.error);
        });

        // Add all new items
        for (const item of items) {
          await new Promise((res, rej) => {
            const addRequest = store.add(item);
            addRequest.onsuccess = () => res();
            addRequest.onerror = () => rej(addRequest.error);
          });
        }

        resolve();
      } catch (error) {
        console.error(`Error saving all to ${storeName}:`, error);
        reject(error);
      }
    });
  }

  // Specific methods for teams
  async getAllTeams() {
    return this.getAll('teams');
  }

  async saveTeam(team) {
    return this.set(team.id, team, 'teams');
  }

  // Specific methods for pitchers
  async getAllPitchers() {
    return this.getAll('pitchers');
  }

  async savePitcher(pitcher) {
    return this.set(pitcher.id, pitcher, 'pitchers');
  }

  // Clear all data (for testing or reset)
  async clearAll() {
    if (!this.isInitialized) await this.init();

    const stores = ['teams', 'pitchers', 'app_settings', 'paused_sessions'];
    
    for (const storeName of stores) {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error(`Error clearing ${storeName}:`, error);
      }
    }

    console.log('All data cleared from IndexedDB');
  }
}

// Create singleton instance
const storage = new Storage();

export default storage;
