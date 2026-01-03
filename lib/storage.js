// Storage utility using IndexedDB for persistent phone storage
// This allows data to persist even when the app is closed

const DB_NAME = 'PitchTrackerDB';
const DB_VERSION = 1;
const STORES = {
  TEAMS: 'teams',
  PITCHERS: 'pitchers',
  GAMES: 'games',
  TRAINING: 'training',
  SETTINGS: 'settings'
};

class PitchTrackerStorage {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  // Initialize the database
  async init() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported - data will not persist');
        this.isReady = false;
        resolve(false);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Database failed to open');
        this.isReady = false;
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('Database opened successfully');
        resolve(true);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.TEAMS)) {
          db.createObjectStore(STORES.TEAMS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.PITCHERS)) {
          db.createObjectStore(STORES.PITCHERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.GAMES)) {
          db.createObjectStore(STORES.GAMES, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORES.TRAINING)) {
          db.createObjectStore(STORES.TRAINING, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        console.log('Database setup complete');
      };
    });
  }

  // Generic save function
  async save(storeName, data) {
    if (!this.isReady) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic get function
  async get(storeName, id) {
    if (!this.isReady) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic get all function
  async getAll(storeName) {
    if (!this.isReady) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic delete function
  async delete(storeName, id) {
    if (!this.isReady) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data (for reset)
  async clearAll() {
    if (!this.isReady) return false;

    return new Promise((resolve, reject) => {
      const storeNames = [STORES.TEAMS, STORES.PITCHERS, STORES.GAMES, STORES.TRAINING, STORES.SETTINGS];
      const transaction = this.db.transaction(storeNames, 'readwrite');

      storeNames.forEach(storeName => {
        transaction.objectStore(storeName).clear();
      });

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Team-specific methods
  async saveTeam(team) {
    return this.save(STORES.TEAMS, team);
  }

  async getTeam(id) {
    return this.get(STORES.TEAMS, id);
  }

  async getAllTeams() {
    return this.getAll(STORES.TEAMS);
  }

  async deleteTeam(id) {
    return this.delete(STORES.TEAMS, id);
  }

  // Pitcher-specific methods
  async savePitcher(pitcher) {
    return this.save(STORES.PITCHERS, pitcher);
  }

  async getPitcher(id) {
    return this.get(STORES.PITCHERS, id);
  }

  async getAllPitchers() {
    return this.getAll(STORES.PITCHERS);
  }

  async deletePitcher(id) {
    return this.delete(STORES.PITCHERS, id);
  }

  // Batch save for multiple items
  async saveAll(storeName, items) {
    if (!this.isReady) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);

      items.forEach(item => {
        objectStore.put(item);
      });

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Create singleton instance
const storage = new PitchTrackerStorage();

export default storage;