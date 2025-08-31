module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // File extensions to test
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/frontend/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/frontend/src/**/*.{test,spec}.{ts,tsx}',
    '<rootDir>/backend/**/__tests__/**/*.{ts,js}',
    '<rootDir>/backend/**/*.{test,spec}.{ts,js}',
    '<rootDir>/shared/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/shared/**/*.{test,spec}.{ts,tsx}'
  ],
  
  // Coverage collection
  collectCoverageFrom: [
    'frontend/src/**/*.{ts,tsx}',
    'backend/**/*.{ts,js}',
    'shared/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
    '!**/jest.config.js',
    '!**/vite.config.ts',
    '!**/tailwind.config.js'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/frontend/src/setupTests.ts',
    '<rootDir>/jest.setup.js'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@/components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@/pages/(.*)$': '<rootDir>/frontend/src/pages/$1',
    '^@/contexts/(.*)$': '<rootDir>/frontend/src/contexts/$1',
    '^@/types/(.*)$': '<rootDir>/frontend/src/types/$1',
    '^@/utils/(.*)$': '<rootDir>/frontend/src/utils/$1',
    '^@/api/(.*)$': '<rootDir>/backend/$1',
    '^@/database/(.*)$': '<rootDir>/database/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true
      }
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@babel/runtime|@babel/runtime-corejs3)/)'
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  
  // Global test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Projects for different test environments
  projects: [
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/frontend/src/**/*.{test,spec}.{ts,tsx}',
        '<rootDir>/frontend/src/**/__tests__/**/*.{ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/frontend/src/setupTests.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1'
      }
    },
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/backend/**/*.{test,spec}.{ts,js}',
        '<rootDir>/backend/**/__tests__/**/*.{ts,js}'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    }
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Notify mode
  notify: true,
  
  // Notify mode options
  notifyMode: 'failure-change'
};
