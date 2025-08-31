// Jest setup file for global test configuration

// Mock console methods in tests to reduce noise
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.log in tests unless explicitly needed
  if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test utilities
global.testUtils = {
  // Mock fetch for API testing
  mockFetch: (response, status = 200) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
        headers: new Map([['content-type', 'application/json']]),
      })
    );
  },

  // Mock localStorage
  mockLocalStorage: () => {
    const store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => store[key]),
        setItem: jest.fn((key, value) => {
          store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          Object.keys(store).forEach((key) => delete store[key]);
        }),
      },
      writable: true,
    });
  },

  // Mock sessionStorage
  mockSessionStorage: () => {
    const store = {};
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn((key) => store[key]),
        setItem: jest.fn((key, value) => {
          store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          Object.keys(store).forEach((key) => delete store[key]);
        }),
      },
      writable: true,
    });
  },

  // Mock IntersectionObserver
  mockIntersectionObserver: () => {
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  },

  // Mock ResizeObserver
  mockResizeObserver: () => {
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  },

  // Mock matchMedia
  mockMatchMedia: () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  },

  // Mock window.scrollTo
  mockScrollTo: () => {
    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
    });
  },

  // Create test data factories
  createTestData: {
    // Stock data factory
    stock: (overrides = {}) => ({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      marketCap: 2000000000000,
      price: 150.00,
      change: 2.50,
      changePercent: 1.67,
      volume: 50000000,
      ...overrides,
    }),

    // Price data factory
    priceData: (overrides = {}) => ({
      date: '2025-01-15',
      open: 148.00,
      high: 152.00,
      low: 147.50,
      close: 150.00,
      volume: 50000000,
      ...overrides,
    }),

    // User factory
    user: (overrides = {}) => ({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      preferences: {
        theme: 'light',
        currency: 'USD',
      },
      ...overrides,
    }),
  },

  // Async testing utilities
  async: {
    // Wait for a condition to be true
    waitFor: (condition, timeout = 1000) => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
          if (condition()) {
            resolve();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Condition not met within timeout'));
          } else {
            setTimeout(check, 10);
          }
        };
        check();
      });
    },

    // Wait for a specific time
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  },
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.REACT_APP_API_URL = 'http://localhost:3000';
process.env.REACT_APP_ENVIRONMENT = 'test';

// Suppress specific warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress React 18 warnings about act()
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: An update to') &&
    args[0].includes('inside a test was not wrapped in act')
  ) {
    return;
  }
  // Suppress other common test warnings
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('componentWillReceiveProps') ||
      args[0].includes('componentWillUpdate'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Global test timeout
jest.setTimeout(10000);

// Suppress unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock crypto for tests
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  };
}

// Mock performance API
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
  };
}

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

// Mock URL.revokeObjectURL
global.URL.revokeObjectURL = jest.fn();

// Export for use in individual test files
module.exports = global.testUtils;
