# Development Standards Guide - Stock Market Analysis Project

## 🎯 **Overview**

This guide outlines the expert-level development standards, tools, and best practices implemented in the Stock Market Analysis project. These standards ensure code quality, maintainability, security, and performance across all components.

## 🛠️ **Development Tools & Configuration**

### **Code Quality Tools**

#### **ESLint Configuration** (`.eslintrc.js`)
- **TypeScript Support**: Full TypeScript linting with strict rules
- **React Best Practices**: React 18+ patterns and hooks rules
- **Security Rules**: Comprehensive security vulnerability detection
- **Code Quality**: SonarJS rules for maintainability and complexity
- **Import Organization**: Consistent import ordering and validation

#### **Prettier Configuration** (`.prettierrc`)
- **Consistent Formatting**: 80-character line width, 2-space indentation
- **File-Specific Rules**: Different settings for Markdown, JSON, and YAML
- **Integration**: Works seamlessly with ESLint

#### **TypeScript Configuration** (`tsconfig.json`)
- **Strict Mode**: All strict TypeScript compiler options enabled
- **Modern Features**: ES2022 target with latest TypeScript features
- **Path Mapping**: Clean import paths with `@/` aliases
- **Project References**: Separate configurations for frontend and backend

### **Testing Framework**

#### **Jest Configuration** (`jest.config.js`)
- **Multi-Environment**: Separate configurations for frontend and backend
- **Coverage Thresholds**: 80%+ coverage requirement
- **TypeScript Support**: Full TypeScript testing with ts-jest
- **Mock Utilities**: Comprehensive mocking for browser APIs

#### **Test Setup** (`jest.setup.js`)
- **Global Mocks**: Browser APIs, localStorage, fetch, etc.
- **Test Utilities**: Factory functions for test data
- **Async Helpers**: Utilities for testing asynchronous code
- **Environment Setup**: Test environment configuration

### **Git Hooks & Quality Assurance**

#### **Husky Configuration** (`.husky/pre-commit`)
- **Pre-commit Checks**: Automatic quality validation before commits
- **Quality Gates**: Linting, formatting, type checking, and testing
- **Fail-Fast**: Prevents commits that don't meet quality standards

#### **Lint-Staged Configuration**
- **Selective Processing**: Only process changed files
- **Automated Fixes**: Auto-fix linting and formatting issues
- **Performance**: Optimized for large codebases

## 📋 **Development Standards**

### **Frontend (React + TypeScript)**

#### **Component Architecture**
```typescript
// ✅ Good: Functional component with proper typing
interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant,
  children,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// ❌ Bad: Class component, any types
class Button extends React.Component<any, any> {
  render() {
    return <button onClick={this.props.onClick}>{this.props.children}</button>;
  }
}
```

#### **State Management**
```typescript
// ✅ Good: Custom hook with proper typing
const useStockData = (symbol: string) => {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await fetch(`/api/stocks/${symbol}`);
        const stockData = await response.json();
        setData(stockData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  return { data, loading, error };
};

// ❌ Bad: Inline state, no error handling
const [data, setData] = useState();
useEffect(() => {
  fetch(`/api/stocks/${symbol}`).then(res => res.json()).then(setData);
}, []);
```

#### **Performance Optimization**
```typescript
// ✅ Good: Memoized component with stable props
const StockChart = React.memo<StockChartProps>(({ data, config }) => {
  const chartData = useMemo(() => processChartData(data), [data]);
  const handleClick = useCallback((point) => {
    // Handle click
  }, []);

  return <Chart data={chartData} onClick={handleClick} />;
});

// ❌ Bad: No memoization, inline functions
const StockChart = ({ data, config }) => {
  return (
    <Chart 
      data={data.map(d => ({ ...d, processed: true }))} 
      onClick={(point) => console.log(point)} 
    />
  );
};
```

### **Backend (Node.js + Express)**

#### **API Design**
```typescript
// ✅ Good: Proper error handling, validation, typing
interface CreateStockRequest {
  symbol: string;
  name: string;
  sector: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const createStock = async (
  req: Request<{}, {}, CreateStockRequest>,
  res: Response<ApiResponse<Stock>>
): Promise<void> => {
  try {
    const { symbol, name, sector } = req.body;
    
    // Validate input
    if (!symbol || !name || !sector) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
      return;
    }

    // Business logic
    const stock = await stockService.create({ symbol, name, sector });
    
    res.status(201).json({
      success: true,
      data: stock,
      message: 'Stock created successfully',
    });
  } catch (error) {
    logger.error('Error creating stock:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ❌ Bad: No error handling, no validation, any types
app.post('/stocks', (req, res) => {
  const stock = req.body;
  db.stocks.insert(stock);
  res.json({ success: true });
});
```

#### **Database Operations**
```typescript
// ✅ Good: Parameterized queries, transactions, error handling
const updateStockPrice = async (
  symbol: string,
  price: number,
  date: Date
): Promise<void> => {
  const db = await getDatabase();
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    const stmt = await db.prepare(`
      UPDATE historical_prices 
      SET close = ?, updated_at = ? 
      WHERE symbol = ? AND date = ?
    `);
    
    await stmt.run([price, date.toISOString(), symbol, date.toISOString()]);
    await stmt.finalize();
    
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw new Error(`Failed to update stock price: ${error.message}`);
  }
};

// ❌ Bad: SQL injection, no transactions, no error handling
const updateStockPrice = (symbol, price, date) => {
  db.run(`UPDATE historical_prices SET close = ${price} WHERE symbol = '${symbol}'`);
};
```

### **Security Best Practices**

#### **Input Validation**
```typescript
// ✅ Good: Comprehensive input validation
import Joi from 'joi';

const stockSchema = Joi.object({
  symbol: Joi.string().pattern(/^[A-Z]{1,5}$/).required(),
  name: Joi.string().min(1).max(100).required(),
  sector: Joi.string().valid('Technology', 'Healthcare', 'Finance').required(),
  marketCap: Joi.number().positive().optional(),
});

const validateStockInput = (data: unknown): StockInput => {
  const { error, value } = stockSchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};

// ❌ Bad: No validation, direct usage
const createStock = (req, res) => {
  const stock = req.body; // No validation
  db.stocks.insert(stock);
};
```

#### **Authentication & Authorization**
```typescript
// ✅ Good: JWT validation, role-based access control
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

// ❌ Bad: No authentication, no authorization
app.get('/admin/users', (req, res) => {
  const users = db.users.find();
  res.json(users);
});
```

## 🚀 **Development Workflow**

### **Daily Development Process**

#### **1. Code Quality Checks**
```bash
# Run all quality checks
npm run quality:check

# Fix issues automatically
npm run quality:fix

# Check specific areas
npm run lint:frontend
npm run lint:backend
npm run format:check
npm run type-check
```

#### **2. Testing**
```bash
# Run all tests
npm run test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test suites
npm run test:frontend
npm run test:backend
```

#### **3. Security**
```bash
# Security audit
npm run security:audit

# Check for vulnerabilities
npm run security:check
```

### **Pre-commit Workflow**

1. **Code Changes**: Make your changes
2. **Quality Checks**: Run `npm run quality:check`
3. **Fix Issues**: Address any linting, formatting, or type errors
4. **Tests**: Ensure all tests pass
5. **Commit**: Git commit triggers pre-commit hooks
6. **Quality Gates**: Hooks validate code quality
7. **Success**: Commit proceeds if all checks pass

### **Code Review Standards**

#### **What to Look For**
- **Type Safety**: Proper TypeScript usage, no `any` types
- **Error Handling**: Comprehensive error handling and logging
- **Performance**: Efficient algorithms, proper memoization
- **Security**: Input validation, authentication, authorization
- **Testing**: Adequate test coverage and meaningful tests
- **Documentation**: Clear inline documentation and comments

#### **Review Checklist**
- [ ] Code follows established patterns and conventions
- [ ] All TypeScript errors are resolved
- [ ] ESLint rules are satisfied
- [ ] Prettier formatting is applied
- [ ] Tests are written and passing
- [ ] Error handling is comprehensive
- [ ] Security considerations are addressed
- [ ] Performance implications are considered
- [ ] Documentation is updated if needed

## 📊 **Quality Metrics**

### **Code Coverage Requirements**
- **Overall Coverage**: 80% minimum
- **Critical Paths**: 90% minimum
- **New Features**: 90% minimum
- **Bug Fixes**: 80% minimum

### **Performance Benchmarks**
- **Bundle Size**: < 500KB gzipped
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **API Response Time**: < 200ms (95th percentile)

### **Security Requirements**
- **Vulnerability Scan**: 0 high/critical vulnerabilities
- **Dependency Updates**: Regular security updates
- **Code Review**: Security review for all changes
- **Penetration Testing**: Annual security assessment

## 🔧 **Troubleshooting Common Issues**

### **ESLint Errors**

#### **TypeScript Import Issues**
```bash
# Install missing types
npm install --save-dev @types/[package-name]

# Check TypeScript configuration
npm run type-check
```

#### **React Hooks Issues**
```bash
# Check hooks rules
npm run lint:frontend

# Common fixes:
# - Move hooks to top level
# - Add missing dependencies to useEffect
# - Use useCallback for stable references
```

### **TypeScript Errors**

#### **Strict Mode Issues**
```typescript
// ✅ Good: Proper null checking
const handleClick = (event: React.MouseEvent | null): void => {
  if (event) {
    event.preventDefault();
  }
};

// ❌ Bad: Ignoring strict null checks
const handleClick = (event: React.MouseEvent | null): void => {
  event!.preventDefault(); // Non-null assertion
};
```

#### **Type Definition Issues**
```typescript
// ✅ Good: Proper interface definition
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

// ❌ Bad: Using any type
const handleResponse = (response: any): void => {
  console.log(response.data);
};
```

### **Testing Issues**

#### **Mock Setup Problems**
```typescript
// ✅ Good: Proper mock setup
beforeEach(() => {
  testUtils.mockFetch({ success: true });
  testUtils.mockLocalStorage();
});

afterEach(() => {
  jest.clearAllMocks();
});
```

#### **Async Testing Issues**
```typescript
// ✅ Good: Proper async testing
it('should fetch stock data', async () => {
  testUtils.mockFetch({ symbol: 'AAPL', price: 150 });
  
  render(<StockComponent symbol="AAPL" />);
  
  await waitFor(() => {
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });
});
```

## 📚 **Additional Resources**

### **Documentation**
- [React Best Practices](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ESLint Rules](https://eslint.org/docs/rules/)

### **Tools & Extensions**
- **VS Code Extensions**:
  - ESLint
  - Prettier
  - TypeScript Importer
  - Jest Runner
  - GitLens

- **Browser Extensions**:
  - React Developer Tools
  - Redux DevTools
  - Lighthouse

### **Community & Support**
- **Stack Overflow**: Tagged with relevant technologies
- **GitHub Issues**: Project-specific discussions
- **Discord/Slack**: Development team channels
- **Code Reviews**: Peer review sessions

---

**Remember**: These standards are not just rules to follow—they're tools to help you write better, more maintainable, and more secure code. When in doubt, prioritize code quality, security, and user experience.

**Last Updated**: January 2025  
**Version**: 1.0.0
