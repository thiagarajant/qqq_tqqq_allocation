# Stock Analysis Web Application

A high-performance, responsive web application for analyzing QQQ and TQQQ drawdown cycles with a beautiful Robinhood-like UI.

## 🚀 Features

- **Real-time Analysis**: Analyze QQQ drawdown cycles with customizable thresholds (2%, 5%, 10%, 15%, 20%)
- **Beautiful UI**: Modern, responsive design inspired by Robinhood
- **Interactive Charts**: Visualize market cycles with Recharts
- **Mobile First**: Optimized for both desktop and mobile devices
- **Fast Performance**: Built with Node.js/Express backend and React frontend
- **Real Data**: Uses your existing SQLite database with historical market data

## 🏗️ Architecture

```
stock_analysis_webapp/
├── backend/           # Express.js API server
├── frontend/          # React + TypeScript frontend
├── database/          # Database utilities and schemas
├── static/            # Static assets
└── templates/         # HTML templates
```

### Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Charts**: Recharts
- **Database**: SQLite
- **Build Tool**: Vite (ultra-fast development)

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Python 3.8+ (for analysis scripts)
- Your existing `market_data.db` file

### Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd stock_analysis_webapp
   ```

2. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

3. **Start the development servers:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start both frontend and backend
npm run backend      # Start only backend
npm run frontend     # Start only frontend

# Production
npm run build        # Build frontend for production
npm run start        # Start production backend

# Utilities
npm run install-all  # Install all dependencies
```

### Project Structure

```
frontend/src/
├── components/       # Reusable UI components
├── contexts/        # React contexts for state management
├── pages/           # Page components
├── hooks/           # Custom React hooks
├── types/           # TypeScript type definitions
└── utils/           # Utility functions

backend/
├── server.js        # Main Express server
├── routes/          # API route handlers
├── middleware/      # Express middleware
└── utils/           # Backend utilities
```

## 📊 API Endpoints

### Core Endpoints

- `GET /api/health` - Server health check
- `GET /api/thresholds` - Available drawdown thresholds
- `GET /api/cycles/:threshold` - Get cycles for specific threshold
- `GET /api/summary/:threshold` - Get summary statistics
- `GET /api/chart-data/:threshold` - Get chart data for visualization
- `POST /api/analyze` - Generate new analysis for custom threshold

### Example Usage

```javascript
// Fetch cycles for 5% threshold
const response = await fetch('/api/cycles/5')
const data = await response.json()

// Get summary statistics
const summary = await fetch('/api/summary/5')
const stats = await summary.json()
```

## 🎨 UI Components

### Design System

- **Colors**: Primary blue, success green, warning yellow, danger red
- **Typography**: Inter font family for clean readability
- **Spacing**: Consistent 4px grid system
- **Shadows**: Soft, medium, and large shadow variants
- **Animations**: Smooth transitions and micro-interactions

### Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 📱 Mobile Optimization

- Touch-friendly interface
- Responsive navigation
- Optimized charts for small screens
- Fast loading with Vite
- Progressive Web App ready

## 🚀 Performance Features

- **Code Splitting**: Automatic chunk optimization
- **Lazy Loading**: Components load on demand
- **Compression**: Gzip compression for API responses
- **Caching**: Efficient data fetching and state management
- **Bundle Optimization**: Tree shaking and dead code elimination

## 🔒 Security

- Helmet.js for security headers
- CORS configuration
- Input validation
- SQL injection protection
- Rate limiting ready

## 📈 Future Enhancements

- **Real-time Updates**: WebSocket integration for live data
- **Advanced Charts**: More chart types and interactions
- **Export Features**: PDF reports and data exports
- **User Accounts**: Multi-user support
- **Android App**: React Native conversion using shared logic

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in `vite.config.ts` and `server.js`
2. **Database not found**: Ensure `market_data.db` is in the parent directory
3. **Python errors**: Verify Python 3.8+ is installed and accessible

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Check API health
curl http://localhost:3001/api/health
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or issues:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub

---

**Built with ❤️ for stock market analysis enthusiasts**
