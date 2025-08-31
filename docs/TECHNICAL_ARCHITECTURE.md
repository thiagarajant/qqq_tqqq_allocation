# 🔧 Stock Market Analysis - Technical Architecture

## 🗄️ **Database Schema & Relationships**

```mermaid
erDiagram
    SYMBOLS {
        string symbol PK "Primary Key"
        string name "Company/ETF Name"
        string sector "Business Sector"
        string market_cap "Market Capitalization"
        string exchange "Stock Exchange"
        boolean is_active "Active Status"
        datetime created_at "Creation Timestamp"
        datetime updated_at "Last Update"
    }
    
    HISTORICAL_PRICES {
        int id PK "Auto-increment ID"
        string symbol FK "References SYMBOLS.symbol"
        date date "Price Date"
        decimal open "Opening Price"
        decimal high "High Price"
        decimal low "Low Price"
        decimal close "Closing Price"
        int volume "Trading Volume"
        datetime created_at "Record Creation"
    }
    
    CYCLES {
        int id PK "Auto-increment ID"
        string symbol FK "References SYMBOLS.symbol"
        int cycle_number "Cycle Sequence"
        string severity "Drawdown Severity"
        date ath_date "All-Time High Date"
        decimal ath_price "All-Time High Price"
        date low_date "Low Point Date"
        decimal low_price "Low Point Price"
        decimal drawdown_pct "Drawdown Percentage"
        date recovery_date "Recovery Date"
        decimal recovery_price "Recovery Price"
        int threshold "Threshold Used"
        int ath_to_low_days "Days from ATH to Low"
        int low_to_recovery_days "Days from Low to Recovery"
    }
    
    MARKET_DATA_FRESHNESS {
        string symbol PK "References SYMBOLS.symbol"
        date latest_date "Most Recent Data Date"
        int days_old "Days Since Last Update"
        datetime last_updated "Last Refresh Timestamp"
    }
    
    PORTFOLIO_SIMULATIONS {
        int id PK "Auto-increment ID"
        string base_etf FK "References SYMBOLS.symbol"
        string secondary_symbol FK "References SYMBOLS.symbol"
        decimal allocation_percentage "Allocation %"
        date start_date "Simulation Start"
        date end_date "Simulation End"
        json results "Simulation Results"
        datetime created_at "Creation Timestamp"
    }
    
    SYMBOLS ||--o{ HISTORICAL_PRICES : "has"
    SYMBOLS ||--o{ CYCLES : "has"
    SYMBOLS ||--o{ MARKET_DATA_FRESHNESS : "has"
    SYMBOLS ||--o{ PORTFOLIO_SIMULATIONS : "base_etf"
    SYMBOLS ||--o{ PORTFOLIO_SIMULATIONS : "secondary_symbol"
```

## 🔌 **API Endpoint Architecture**

```mermaid
graph TB
    subgraph "Client Layer"
        C[Browser/React App]
    end
    
    subgraph "API Gateway"
        AG[Express.js Server<br/>Port 3000]
    end
    
    subgraph "Route Handlers"
        RH1[Symbols Router]
        RH2[Cycles Router]
        RH3[Charts Router]
        RH4[Simulation Router]
        RH5[Health Router]
    end
    
    subgraph "Service Layer"
        S1[SymbolService]
        S2[CycleService]
        S3[ChartService]
        S4[SimulationService]
        S5[DataFetchService]
    end
    
    subgraph "Data Access Layer"
        DAL1[Database Queries]
        DAL2[External API Calls]
        DAL3[Data Processing]
    end
    
    subgraph "External APIs"
        EA1[Stooq API]
        EA2[SEC API]
        EA3[Market Data]
    end
    
    C --> AG
    AG --> RH1
    AG --> RH2
    AG --> RH3
    AG --> RH4
    AG --> RH5
    
    RH1 --> S1
    RH2 --> S2
    RH3 --> S3
    RH4 --> S4
    RH5 --> S1
    
    S1 --> DAL1
    S2 --> DAL1
    S3 --> DAL1
    S4 --> DAL1
    S5 --> DAL1
    
    S1 --> DAL2
    S4 --> DAL2
    S5 --> DAL2
    
    DAL2 --> EA1
    DAL2 --> EA2
    DAL2 --> EA3
```

## 📊 **Data Flow & Processing Pipeline**

```mermaid
flowchart TD
    A[User Input: Symbol] --> B[Input Validation]
    B --> C[Symbol Normalization<br/>UPPERCASE]
    C --> D[Database Query]
    D --> E{Data Found?}
    
    E -->|Yes| F[Return Cached Data]
    E -->|No| G[External API Fetch]
    
    G --> H[Data Validation]
    H --> I{Valid Data?}
    I -->|Yes| J[Data Normalization]
    I -->|No| K[Error Response]
    
    J --> L[Database Storage]
    L --> M[Data Indexing]
    M --> N[Response Generation]
    
    F --> N
    N --> O[API Response]
    K --> O
    
    subgraph "Data Processing Steps"
        DP1[Price Validation]
        DP2[Volume Validation]
        DP3[Date Normalization]
        DP4[Symbol Standardization]
        DP5[Duplicate Detection]
    end
    
    H --> DP1
    H --> DP2
    H --> DP3
    H --> DP4
    H --> DP5
    
    subgraph "Storage Operations"
        SO1[Insert New Records]
        SO2[Update Existing]
        SO3[Handle Duplicates]
        SO4[Maintain Indexes]
    end
    
    L --> SO1
    L --> SO2
    L --> SO3
    L --> SO4
```

## 🐳 **Container Architecture & Networking**

```mermaid
graph TB
    subgraph "Host Machine (localhost)"
        subgraph "Docker Network: stock-market-analysis-network"
            subgraph "Frontend Container"
                FC[stock-market-analysis-dev<br/>Port 5173:5173]
                FC1[Vite Dev Server]
                FC2[React App]
                FC3[Hot Reload]
                FC4[Source Mount]
            end
            
            subgraph "Backend Container"
                BC[stock-market-analysis-webapp<br/>Port 3000:3000]
                BC1[Express.js Server]
                BC2[SQLite Database]
                BC3[Health Endpoints]
                BC4[API Routes]
            end
        end
        
        subgraph "Volume Mounts"
            VM1[./database → /app/database]
            VM2[./logs → /app/logs]
            VM3[./frontend → /app/frontend]
            VM4[./backend → /app/backend]
        end
        
        subgraph "Network Configuration"
            NC1[Bridge Driver]
            NC2[Internal DNS]
            NC3[Port Forwarding]
            NC4[Service Discovery]
        end
    end
    
    subgraph "External Access"
        EA1[Browser: localhost:5173]
        EA2[API: localhost:3000]
        EA3[Health: localhost:3000/health]
    end
    
    FC --> NC1
    BC --> NC1
    FC --> VM3
    BC --> VM1
    BC --> VM2
    BC --> VM4
    
    EA1 --> FC
    EA2 --> BC
    EA3 --> BC
```

## 🔄 **State Management & Data Flow**

```mermaid
graph LR
    subgraph "React State Management"
        subgraph "Context Providers"
            CP1[ETFContext]
            CP2[ThresholdContext]
            CP3[DataContext]
        end
        
        subgraph "Component State"
            CS1[Local State]
            CS2[Form State]
            CS3[UI State]
        end
        
        subgraph "Custom Hooks"
            CH1[useETF]
            CH2[useThreshold]
            CH3[useData]
            CH4[useSymbols]
        end
    end
    
    subgraph "Data Flow"
        DF1[User Input]
        DF2[API Calls]
        DF3[State Updates]
        DF4[UI Re-render]
    end
    
    subgraph "External Data"
        ED1[Backend API]
        ED2[Local Storage]
        ED3[Session Storage]
    end
    
    CP1 --> CH1
    CP2 --> CH2
    CP3 --> CH3
    
    CH1 --> DF1
    CH2 --> DF1
    CH3 --> DF1
    
    DF1 --> DF2
    DF2 --> ED1
    ED1 --> DF3
    DF3 --> DF4
    
    CS1 --> DF1
    CS2 --> DF1
    CS3 --> DF1
```

## 🛠️ **Development & Build Pipeline**

```mermaid
graph TB
    subgraph "Development Environment"
        DE1[Local Code Changes]
        DE2[Docker Volume Mounts]
        DE3[Hot Reload]
        DE4[Live Testing]
    end
    
    subgraph "Build Process"
        BP1[Frontend Build]
        BP2[Backend Build]
        BP3[Database Setup]
        BP4[Container Build]
    end
    
    subgraph "Quality Assurance"
        QA1[ESLint]
        QA2[Prettier]
        QA3[TypeScript Check]
        QA4[Unit Tests]
        QA5[Integration Tests]
    end
    
    subgraph "Deployment"
        DEP1[Production Build]
        DEP2[Container Optimization]
        DEP3[Health Checks]
        DEP4[Monitoring]
    end
    
    DE1 --> DE2
    DE2 --> DE3
    DE3 --> DE4
    
    DE4 --> BP1
    DE4 --> BP2
    BP1 --> BP3
    BP2 --> BP3
    BP3 --> BP4
    
    BP4 --> QA1
    QA1 --> QA2
    QA2 --> QA3
    QA3 --> QA4
    QA4 --> QA5
    
    QA5 --> DEP1
    DEP1 --> DEP2
    DEP2 --> DEP3
    DEP3 --> DEP4
```

## 🔍 **Performance & Optimization Architecture**

```mermaid
graph TB
    subgraph "Frontend Performance"
        FP1[Code Splitting]
        FP2[Lazy Loading]
        FP3[Memoization]
        FP4[Virtual Scrolling]
        FP5[Bundle Optimization]
    end
    
    subgraph "Backend Performance"
        BP1[Database Indexing]
        BP2[Query Optimization]
        BP3[Response Caching]
        BP4[Compression]
        BP5[Rate Limiting]
    end
    
    subgraph "Database Performance"
        DP1[Index Strategy]
        DP2[Query Planning]
        DP3[Connection Pooling]
        DP4[Data Partitioning]
        DP5[Cache Layers]
    end
    
    subgraph "Network Performance"
        NP1[CDN Usage]
        NP2[Load Balancing]
        NP3[Compression]
        NP4[HTTP/2]
        NP5[Service Workers]
    end
    
    FP1 --> FP2
    FP2 --> FP3
    FP3 --> FP4
    FP4 --> FP5
    
    BP1 --> BP2
    BP2 --> BP3
    BP3 --> BP4
    BP4 --> BP5
    
    DP1 --> DP2
    DP2 --> DP3
    DP3 --> DP4
    DP4 --> DP5
    
    NP1 --> NP2
    NP2 --> NP3
    NP3 --> NP4
    NP4 --> NP5
```

## 🛡️ **Security & Validation Architecture**

```mermaid
graph TB
    subgraph "Input Security"
        IS1[Symbol Validation]
        IS2[SQL Injection Prevention]
        IS3[XSS Prevention]
        IS4[CSRF Protection]
        IS5[Rate Limiting]
    end
    
    subgraph "Data Security"
        DS1[Parameterized Queries]
        DS2[Input Sanitization]
        DS3[Output Encoding]
        DS4[Access Control]
        DS5[Audit Logging]
    end
    
    subgraph "Network Security"
        NS1[CORS Configuration]
        NS2[Security Headers]
        NS3[HTTPS Enforcement]
        NS4[Firewall Rules]
        NS5[Network Monitoring]
    end
    
    subgraph "Container Security"
        CS1[Image Scanning]
        CS2[Vulnerability Assessment]
        CS3[Resource Limits]
        CS4[Network Isolation]
        CS5[Security Updates]
    end
    
    IS1 --> IS2
    IS2 --> IS3
    IS3 --> IS4
    IS4 --> IS5
    
    DS1 --> DS2
    DS2 --> DS3
    DS3 --> DS4
    DS4 --> DS5
    
    NS1 --> NS2
    NS2 --> NS3
    NS3 --> NS4
    NS4 --> NS5
    
    CS1 --> CS2
    CS2 --> CS3
    CS3 --> CS4
    CS4 --> CS5
```

## 📈 **Monitoring & Observability**

```mermaid
graph TB
    subgraph "Application Monitoring"
        AM1[Performance Metrics]
        AM2[Error Tracking]
        AM3[User Analytics]
        AM4[API Usage]
        AM5[Response Times]
    end
    
    subgraph "Infrastructure Monitoring"
        IM1[Container Health]
        IM2[Resource Usage]
        IM3[Network Status]
        IM4[Disk Space]
        IM5[Memory Usage]
    end
    
    subgraph "Database Monitoring"
        DM1[Query Performance]
        DM2[Connection Status]
        DM3[Storage Usage]
        DM4[Index Usage]
        DM5[Lock Monitoring]
    end
    
    subgraph "Logging & Tracing"
        LT1[Structured Logs]
        LT2[Request Tracing]
        LT3[Error Logging]
        LT4[Performance Logs]
        LT5[Audit Logs]
    end
    
    AM1 --> AM2
    AM2 --> AM3
    AM3 --> AM4
    AM4 --> AM5
    
    IM1 --> IM2
    IM2 --> IM3
    IM3 --> IM4
    IM4 --> IM5
    
    DM1 --> DM2
    DM2 --> DM3
    DM3 --> DM4
    DM4 --> DM5
    
    LT1 --> LT2
    LT2 --> LT3
    LT3 --> LT4
    LT4 --> LT5
```

---

## 📋 **Technical Implementation Details**

### **🔧 Database Implementation**
- **SQLite3** with Node.js bindings
- **Connection pooling** for concurrent access
- **Prepared statements** for security
- **Transaction management** for data integrity
- **Migration system** for schema evolution

### **🌐 API Implementation**
- **Express.js** with middleware stack
- **RESTful design** principles
- **JSON responses** with consistent format
- **Error handling** with proper HTTP codes
- **Request validation** with Joi schemas

### **⚛️ Frontend Implementation**
- **React 18** with modern patterns
- **TypeScript** for type safety
- **Context API** for state management
- **Custom hooks** for logic reuse
- **Component composition** for modularity

### **🐳 Container Implementation**
- **Multi-stage builds** for optimization
- **Volume mounting** for development
- **Health checks** for monitoring
- **Resource limits** for stability
- **Network isolation** for security

---

*This technical architecture document provides detailed implementation specifications for the Stock Market Analysis system. Use this for development planning, system design, and technical decision-making.*
