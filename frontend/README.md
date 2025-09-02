# Frontend - Stock Market Analysis React Application

## 🎯 **Overview**

The frontend is a modern React 18 application built with TypeScript, designed to provide an intuitive and responsive interface for stock market analysis. It features real-time data visualization, interactive charts, and a mobile-first design approach.

## 🏗️ **Architecture**

### **Technology Stack**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.0 (ultra-fast development server)
- **Styling**: Tailwind CSS + Framer Motion
- **Charts**: Recharts (professional charting library)
- **UI Components**: Headless UI + Heroicons + Lucide React
- **State Management**: React Context API
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios for API communication

### **Project Structure**
```
frontend/
├── 📁 src/
│   ├── 📁 components/          # Reusable UI components
│   │   └── Navbar.tsx         # Main navigation component
│   ├── 📁 contexts/            # React context providers
│   │   ├── ETFContext.tsx     # ETF selection and data management
│   │   ├── ThresholdContext.tsx # Drawdown threshold management
│   │   └── DataContext.tsx    # API data and caching
│   ├── 📁 pages/               # Main application pages
│   │   ├── Dashboard.tsx      # Main dashboard with overview
│   │   ├── Analysis.tsx       # Detailed stock analysis
│   │   ├── Cycles.tsx         # Drawdown cycle visualization
│   │   └── Simulation.tsx     # Portfolio simulation tools
│   ├── 📁 data/                # Static data and types
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles and Tailwind
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── postcss.config.js           # PostCSS configuration
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and npm
- Docker (for containerized development)

### **Local Development**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### **Docker Development**
```bash
# Start frontend development container
docker-compose --profile dev up -d

# Access at http://localhost:5173
```

## 🎨 **UI Components & Design System**

### **Core Components**

#### **Navbar.tsx**
- **Purpose**: Main navigation and ETF selection
- **Features**: 
  - ETF dropdown selection (QQQ, TQQQ, SQQQ, etc.)
  - Threshold selection (2%, 5%, 10%, 15%, 20%)
  - Responsive mobile navigation
  - Theme switching capability

#### **Page Components**

1. **Dashboard.tsx** (Main Overview)
   - **Features**: 
     - Symbol search and selection
     - Quick chart previews
     - Recent analysis summary
     - Quick action buttons
   - **Charts**: Line charts, area charts, bar charts
   - **Data**: Real-time symbol search and selection

2. **Analysis.tsx** (Detailed Analysis)
   - **Features**:
     - Comprehensive stock metrics
     - Performance indicators
     - Risk assessment
     - Historical comparison
   - **Charts**: Multi-timeframe analysis charts

3. **Cycles.tsx** (Drawdown Cycles)
   - **Features**:
     - Drawdown cycle identification
     - Cycle duration analysis
     - Recovery patterns
     - Threshold-based filtering
   - **Charts**: Cycle visualization with Recharts

4. **Simulation.tsx** (Portfolio Simulation)
   - **Features**:
     - Portfolio backtesting
     - Strategy simulation
     - Performance metrics
     - Risk analysis
   - **Charts**: Portfolio performance charts

5. **Admin.tsx** (Database Administration)
   - **Features**:
     - Database statistics and health monitoring
     - Delete database functionality with confirmation
     - Direct folder upload from computer to populate database
     - Populate database from folder with CSV files
     - Automatic CSV/TXT file detection and recursive search
     - Automatic file compression for efficient transfer
     - Support for large datasets (50,000+ files)
     - Batch processing for optimal performance
     - Automatic symbol uppercase conversion
     - Duplicate entry prevention
     - Action history and logging
     - **Local Data Only**: No external API calls - all data uploaded locally
   - **Data Management**: Folder upload, validation, compression, and processing

### **Design System**

#### **Colors**
- **Primary**: Blue (#3B82F6) - Main actions and links
- **Success**: Green (#10B981) - Positive indicators
- **Warning**: Yellow (#F59E0B) - Caution states
- **Danger**: Red (#EF4444) - Error states
- **Neutral**: Gray scale for text and borders

#### **Typography**
- **Font Family**: Inter (clean, modern sans-serif)
- **Headings**: Bold weights for hierarchy
- **Body**: Regular weight for readability
- **Code**: Monospace for technical content

#### **Spacing & Layout**
- **Grid System**: 4px base unit
- **Breakpoints**: Mobile-first responsive design
- **Containers**: Max-width constraints for readability
- **Padding**: Consistent spacing patterns

#### **Animations**
- **Transitions**: Smooth 150ms ease-in-out
- **Hover Effects**: Subtle scale and shadow changes
- **Loading States**: Skeleton screens and spinners
- **Page Transitions**: Framer Motion animations

## 🔧 **Configuration Files**

### **vite.config.ts**
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          ui: ['@headlessui/react', '@heroicons/react', 'framer-motion'],
        },
      },
    },
  },
})
```

### **tailwind.config.js**
- **Content**: Source files for purging unused CSS
- **Theme**: Custom color palette and spacing
- **Plugins**: Typography and forms support

### **tsconfig.json**
- **Target**: ES2020 for modern JavaScript features
- **Module**: ESNext for module resolution
- **Strict**: Enabled for type safety
- **Paths**: Alias configuration for imports

## 📱 **Responsive Design**

### **Breakpoints**
- **Mobile**: < 768px (default)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
- **Large Desktop**: > 1280px

### **Mobile-First Approach**
- **Touch Targets**: Minimum 44px for touch interactions
- **Navigation**: Collapsible mobile menu
- **Charts**: Responsive chart containers
- **Forms**: Mobile-optimized input fields

### **Performance Optimizations**
- **Lazy Loading**: Components load on demand
- **Code Splitting**: Automatic chunk optimization
- **Image Optimization**: WebP format with fallbacks
- **Bundle Analysis**: Tree shaking for unused code

## 🔄 **State Management**

### **Context Providers**

#### **ETFContext.tsx**
```typescript
interface ETFContextType {
  selectedETF: string
  setSelectedETF: (etf: string) => void
  etfData: ETFData | null
  isLoading: boolean
}
```
- **Purpose**: Manages selected ETF and related data
- **Features**: ETF selection, data fetching, loading states

#### **ThresholdContext.tsx**
```typescript
interface ThresholdContextType {
  threshold: number
  setThreshold: (threshold: number) => void
  availableThresholds: number[]
}
```
- **Purpose**: Manages drawdown threshold selection
- **Features**: Threshold validation, default values

#### **DataContext.tsx**
```typescript
interface DataContextType {
  symbolData: SymbolData[]
  chartData: ChartData[]
  fetchData: (symbol: string, threshold: number) => Promise<void>
  isLoading: boolean
  error: string | null
}
```
- **Purpose**: Manages API data and caching
- **Features**: Data fetching, caching, error handling

## 📊 **Charting & Data Visualization**

### **Recharts Integration**
- **Chart Types**: Line, Area, Bar, Scatter, Composed
- **Features**: 
  - Responsive containers
  - Interactive tooltips
  - Zoom and pan capabilities
  - Custom styling and themes

### **Chart Components**
```typescript
// Example chart component
<LineChart data={chartData} width={800} height={400}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="close" stroke="#8884d8" />
</LineChart>
```

### **Data Processing**
- **Time Series**: Date formatting and sorting
- **Aggregations**: Moving averages, volatility calculations
- **Filtering**: Threshold-based data filtering
- **Transformations**: Data normalization and scaling

## 🚀 **Development Workflow**

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### **Development Server**
- **Port**: 5173 (configurable)
- **Hot Reload**: Instant updates on code changes
- **Proxy**: API requests forwarded to backend
- **Source Maps**: Full debugging support

### **Build Process**
1. **Type Checking**: TypeScript compilation
2. **Bundling**: Vite rollup bundling
3. **Optimization**: Tree shaking and minification
4. **Output**: Optimized production files

### **Code Quality**
- **ESLint**: Code style and best practices
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Husky**: Git hooks for quality checks

## 🧪 **Testing Strategy**

### **Testing Tools**
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **MSW**: API mocking for tests
- **Cypress**: End-to-end testing (planned)

### **Test Structure**
```
__tests__/
├── components/       # Component tests
├── contexts/         # Context tests
├── pages/            # Page tests
├── utils/            # Utility function tests
└── mocks/            # Mock data and services
```

## 📦 **Dependencies**

### **Production Dependencies**
- **React 18**: Latest React with concurrent features
- **TypeScript**: Static type checking
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Professional charting library
- **Framer Motion**: Animation library
- **Headless UI**: Unstyled UI components
- **Lucide React**: Icon library

### **Development Dependencies**
- **ESLint**: Code linting and formatting
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing
- **TypeScript ESLint**: TypeScript-specific linting rules

## 🔍 **Performance Monitoring**

### **Metrics to Track**
- **Bundle Size**: JavaScript and CSS bundle sizes
- **Load Time**: First contentful paint
- **Runtime Performance**: Component render times
- **Memory Usage**: Memory leaks and optimization

### **Optimization Techniques**
- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Component lazy loading
- **Memoization**: React.memo and useMemo
- **Bundle Analysis**: Webpack bundle analyzer

## 🚨 **Common Issues & Solutions**

### **Build Issues**
1. **Port Conflicts**: Change port in vite.config.ts
2. **Type Errors**: Run `npm run type-check`
3. **Dependency Issues**: Clear node_modules and reinstall

### **Runtime Issues**
1. **API Errors**: Check proxy configuration
2. **Chart Rendering**: Verify data format
3. **State Updates**: Check context provider setup

### **Performance Issues**
1. **Slow Renders**: Implement React.memo
2. **Large Bundles**: Analyze with bundle analyzer
3. **Memory Leaks**: Check useEffect cleanup

## 📚 **Additional Resources**

- **React Documentation**: https://react.dev/
- **Vite Documentation**: https://vitejs.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Recharts**: https://recharts.org/
- **Framer Motion**: https://www.framer.com/motion/

---

**Frontend Status**: ✅ **FULLY OPERATIONAL**  
**Last Updated**: August 2025  
**Version**: 1.5.0
