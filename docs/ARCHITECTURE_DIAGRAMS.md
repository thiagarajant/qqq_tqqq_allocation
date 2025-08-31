# 🏗️ Stock Market Analysis - Architecture Diagrams

## 📋 **Table of Contents**
1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Database Schema](#database-schema)
5. [Deployment Architecture](#deployment-architecture)
6. [API Architecture](#api-architecture)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Architecture](#backend-architecture)

---

## 🎯 **System Overview**

```mermaid
graph TB
    subgraph "User Layer"
        U[User/Browser]
    end
    
    subgraph "Frontend Layer"
        F[React Frontend<br/>Port 5173]
        F1[Dashboard]
        F2[Cycles Analysis]
        F3[Simulation]
        F4[Portfolio]
    end
    
    subgraph "Backend Layer"
        B[Express.js API<br/>Port 3000]
        B1[Symbols API]
        B2[Cycles API]
        B3[Chart Data API]
        B4[Simulation API]
    end
    
    subgraph "Data Layer"
        DB[(SQLite Database<br/>market_data.db)]
        DB1[Symbols Table]
        DB2[Historical Prices]
        DB3[Cycles Data]
        DB4[Market Data]
    end
    
    subgraph "External APIs"
        E1[Stooq API]
        E2[SEC API]
        E3[Market Data Sources]
    end
    
    U --> F
    F --> B
    B --> DB
    B --> E1
    B --> E2
    B --> E3
```

---

## 🧩 **Component Architecture**

```mermaid
graph LR
    subgraph "Frontend Components"
        FC1[Navbar]
        FC2[Dashboard]
        FC3[Cycles]
        FC4[Simulation]
        FC5[Portfolio]
    end
    
    subgraph "React Contexts"
        RC1[ETF Context]
        RC2[Threshold Context]
        RC3[Data Context]
    end
    
    subgraph "Backend Services"
        BS1[Symbol Service]
        BS2[Cycle Service]
        BS3[Chart Service]
        BS4[Simulation Service]
        BS5[Data Fetch Service]
    end
    
    subgraph "Database Layer"
        DL1[SQLite3]
        DL2[Migrations]
        DL3[Views]
    end
    
    FC1 --> RC1
    FC2 --> RC1
    FC2 --> RC2
    FC3 --> RC2
    FC3 --> RC3
    FC4 --> RC1
    FC4 --> RC2
    
    RC1 --> BS1
    RC2 --> BS2
    RC3 --> BS3
    
    BS1 --> DL1
    BS2 --> DL1
    BS3 --> DL1
    BS4 --> DL1
    BS5 --> DL1
```

---

## 🔄 **Data Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant E as External APIs
    
    U->>F: Enter Symbol (e.g., TSLA)
    F->>F: Convert to UPPERCASE
    F->>B: GET /api/symbols?query=TSLA
    B->>DB: Query symbols table
    DB-->>B: Return symbol data
    B-->>F: Return filtered results
    F->>U: Display suggestions
    
    U->>F: Select TSLA
    F->>B: GET /api/chart-data/5/TSLA
    B->>DB: Query historical prices
    DB-->>B: Return price data
    B-->>F: Return chart data
    F->>U: Display price chart
    
    F->>B: GET /api/cycles/5/TSLA
    B->>DB: Query cycles data
    DB-->>B: Return cycles
    B-->>F: Return cycle analysis
    F->>U: Display cycles
    
    F->>B: POST /api/simulation
    B->>DB: Query simulation data
    B->>E: Fetch additional data if needed
    E-->>B: Return market data
    B-->>F: Return simulation results
    F->>U: Display simulation
```

---

## 🗄️ **Database Schema**

```mermaid
erDiagram
    SYMBOLS {
        string symbol PK
        string name
        string sector
        string market_cap
        string exchange
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    HISTORICAL_PRICES {
        int id PK
        string symbol FK
        date date
        decimal open
        decimal high
        decimal low
        decimal close
        int volume
        datetime created_at
    }
    
    CYCLES {
        int id PK
        string symbol FK
        int cycle_number
        string severity
        date ath_date
        decimal ath_price
        date low_date
        decimal low_price
        decimal drawdown_pct
        date recovery_date
        decimal recovery_price
        int threshold
        int ath_to_low_days
        int low_to_recovery_days
    }
    
    MARKET_DATA_FRESHNESS {
        string symbol PK
        date latest_date
        int days_old
        datetime last_updated
    }
    
    SYMBOLS ||--o{ HISTORICAL_PRICES : "has"
    SYMBOLS ||--o{ CYCLES : "has"
    SYMBOLS ||--o{ MARKET_DATA_FRESHNESS : "has"
```

---

## 🐳 **Deployment Architecture**

```mermaid
graph TB
    subgraph "Host Machine (localhost)"
        subgraph "Docker Compose"
            subgraph "Backend Container"
                BC[stock-market-analysis-app<br/>Port 3000:3000]
                BC1[Express.js Server]
                BC2[SQLite Database]
                BC3[Health Checks]
            end
            
            subgraph "Frontend Container"
                FC[stock-market-analysis-dev<br/>Port 5173:5173]
                FC1[Vite Dev Server]
                FC2[React App]
                FC3[Hot Reload]
            end
        end
        
        subgraph "Docker Network"
            DN[stock-market-analysis-network<br/>Bridge Driver]
        end
        
        subgraph "Volumes"
            V1[./database:/app/database]
            V2[./logs:/app/logs]
            V3[.:/app (frontend)]
        end
    end
    
    subgraph "External Access"
        EA1[Browser: localhost:5173]
        EA2[API: localhost:3000]
    end
    
    BC --> DN
    FC --> DN
    BC --> V1
    BC --> V2
    FC --> V3
    EA1 --> FC
    EA2 --> BC
```

---

## 🔌 **API Architecture**

```mermaid
graph TB
    subgraph "API Endpoints"
        subgraph "Symbols API"
            SA1[GET /api/symbols]
            SA2[GET /api/symbols/:symbol]
            SA3[GET /api/symbols?query=:query]
        end
        
        subgraph "Cycles API"
            CA1[GET /api/cycles/:threshold/:symbol]
            CA2[GET /api/summary/:threshold/:symbol]
        end
        
        subgraph "Chart API"
            CHA1[GET /api/chart-data/:threshold/:symbol]
            CHA2[GET /api/available-etfs]
        end
        
        subgraph "Simulation API"
            SIM1[POST /api/simulation]
            SIM2[POST /api/smart-strategy]
        end
        
        subgraph "Data Fetch API"
            DFA1[POST /api/fetch-single-etf]
            DFA2[POST /api/fetch-historical-data/:symbol]
        end
        
        subgraph "Health API"
            HA1[GET /api/health]
        end
    end
    
    subgraph "Middleware"
        M1[CORS]
        M2[Helmet Security]
        M3[Compression]
        M4[Error Handling]
    end
    
    subgraph "Database Layer"
        DL[SQLite3]
        DL1[Queries]
        DL2[Transactions]
        DL3[Views]
    end
    
    SA1 --> M1
    CA1 --> M1
    CHA1 --> M1
    SIM1 --> M1
    
    M1 --> M2
    M2 --> M3
    M3 --> M4
    
    M4 --> DL
    DL --> DL1
    DL --> DL2
    DL --> DL3
```

---

## ⚛️ **Frontend Architecture**

```mermaid
graph TB
    subgraph "React App Structure"
        subgraph "Pages"
            P1[Dashboard]
            P2[Cycles]
            P3[Simulation]
            P4[Portfolio]
        end
        
        subgraph "Components"
            C1[Navbar]
            C2[SymbolSearch]
            C3[PriceChart]
            C4[CycleTable]
            C5[SimulationForm]
        end
        
        subgraph "Contexts"
            CT1[ETFContext]
            CT2[ThresholdContext]
            CT3[DataContext]
        end
        
        subgraph "Hooks"
            H1[useETF]
            H2[useThreshold]
            H3[useData]
            H4[useSymbols]
        end
        
        subgraph "Utilities"
            U1[API Calls]
            U2[Data Processing]
            U3[Chart Helpers]
            U4[Formatting]
        end
    end
    
    subgraph "External Libraries"
        EL1[Recharts]
        EL2[Framer Motion]
        EL3[Tailwind CSS]
        EL4[React Router]
    end
    
    P1 --> C1
    P1 --> C2
    P1 --> C3
    P2 --> C4
    P3 --> C5
    
    C1 --> CT1
    C2 --> CT1
    C3 --> CT2
    C4 --> CT2
    C5 --> CT1
    
    CT1 --> H1
    CT2 --> H2
    CT3 --> H3
    
    H1 --> U1
    H2 --> U1
    H3 --> U1
    
    U1 --> EL1
    U2 --> EL2
    U3 --> EL3
```

---

## 🔧 **Backend Architecture**

```mermaid
graph TB
    subgraph "Express.js Server"
        subgraph "Entry Point"
            EP[server.js]
            EP1[Port Configuration]
            EP2[Database Connection]
            EP3[Middleware Setup]
        end
        
        subgraph "Routes"
            R1[symbols.js]
            R2[cycles.js]
            R3[charts.js]
            R4[simulation.js]
            R5[health.js]
        end
        
        subgraph "Services"
            S1[SymbolService]
            S2[CycleService]
            S3[ChartService]
            S4[SimulationService]
            S5[DataFetchService]
        end
        
        subgraph "Database Layer"
            DB1[SQLite Connection]
            DB2[Query Builders]
            DB3[Data Models]
            DB4[Migrations]
        end
        
        subgraph "External Integrations"
            EI1[Stooq API Client]
            EI2[SEC API Client]
            EI3[Market Data Clients]
        end
    end
    
    subgraph "Middleware Stack"
        MS1[CORS]
        MS2[Helmet]
        MS3[Compression]
        MS4[Error Handler]
        MS5[Request Logger]
    end
    
    EP --> EP1
    EP --> EP2
    EP --> EP3
    
    EP3 --> MS1
    MS1 --> MS2
    MS2 --> MS3
    MS3 --> MS4
    MS4 --> MS5
    
    MS5 --> R1
    MS5 --> R2
    MS5 --> R3
    MS5 --> R4
    MS5 --> R5
    
    R1 --> S1
    R2 --> S2
    R3 --> S3
    R4 --> S4
    R5 --> S1
    
    S1 --> DB1
    S2 --> DB1
    S3 --> DB1
    S4 --> DB1
    
    S1 --> EI1
    S1 --> EI2
    S4 --> EI3
```

---

## 📊 **Data Processing Flow**

```mermaid
flowchart TD
    A[Raw Market Data] --> B[Data Validation]
    B --> C{Valid Data?}
    C -->|Yes| D[Data Normalization]
    C -->|No| E[Error Logging]
    D --> F[Database Storage]
    F --> G[Data Indexing]
    G --> H[Cycle Detection]
    H --> I[Performance Calculation]
    I --> J[API Response]
    
    subgraph "Data Sources"
        DS1[Stooq API]
        DS2[SEC Database]
        DS3[Market Feeds]
    end
    
    subgraph "Processing Steps"
        PS1[Price Validation]
        PS2[Volume Validation]
        PS3[Date Normalization]
        PS4[Symbol Standardization]
    end
    
    subgraph "Output Formats"
        OF1[JSON API]
        OF2[Chart Data]
        OF3[Cycle Analysis]
        OF4[Simulation Results]
    end
    
    DS1 --> A
    DS2 --> A
    DS3 --> A
    
    B --> PS1
    B --> PS2
    B --> PS3
    B --> PS4
    
    J --> OF1
    J --> OF2
    J --> OF3
    J --> OF4
```

---

## 🚀 **Development Workflow**

```mermaid
graph LR
    subgraph "Development"
        D1[Code Changes]
        D2[Hot Reload]
        D3[Live Testing]
    end
    
    subgraph "Docker Environment"
        DE1[Frontend Container]
        DE2[Backend Container]
        DE3[Database Volume]
    end
    
    subgraph "Quality Assurance"
        QA1[ESLint]
        QA2[Prettier]
        QA3[TypeScript Check]
        QA4[Tests]
    end
    
    subgraph "Deployment"
        DEP1[Build Image]
        DEP2[Test Container]
        DEP3[Deploy]
    end
    
    D1 --> D2
    D2 --> D3
    D3 --> DE1
    D3 --> DE2
    
    DE1 --> QA1
    DE2 --> QA2
    QA1 --> QA3
    QA2 --> QA4
    
    QA4 --> DEP1
    DEP1 --> DEP2
    DEP2 --> DEP3
```

---

## 📝 **Key Architecture Decisions**

### **1. Containerization Strategy**
- **Docker Compose** for local development
- **Multi-stage builds** for optimized production images
- **Volume mounting** for hot reload and data persistence

### **2. Database Choice**
- **SQLite** for simplicity and portability
- **File-based storage** for easy backup and version control
- **In-memory caching** for performance optimization

### **3. API Design**
- **RESTful endpoints** for consistency
- **JSON responses** for frontend compatibility
- **Error handling** with proper HTTP status codes

### **4. Frontend Architecture**
- **React 18** with modern hooks and patterns
- **Context API** for state management
- **Component composition** for reusability

### **5. Development Experience**
- **Hot reload** for rapid development
- **TypeScript** for type safety
- **ESLint + Prettier** for code quality

---

## 🔍 **Performance Considerations**

### **1. Database Optimization**
- **Indexes** on frequently queried columns
- **Views** for complex queries
- **Connection pooling** for concurrent access

### **2. API Performance**
- **Response caching** for static data
- **Pagination** for large datasets
- **Compression** for response size

### **3. Frontend Performance**
- **Code splitting** for bundle optimization
- **Lazy loading** for components
- **Memoization** for expensive calculations

---

## 🛡️ **Security Considerations**

### **1. Input Validation**
- **Symbol sanitization** to prevent injection
- **Rate limiting** for API endpoints
- **CORS configuration** for cross-origin requests

### **2. Data Protection**
- **SQL parameterization** to prevent injection
- **Input sanitization** for user-provided data
- **Error handling** without information leakage

---

*This document provides a comprehensive overview of the Stock Market Analysis project architecture. Use these diagrams for development planning, system understanding, and team communication.*
