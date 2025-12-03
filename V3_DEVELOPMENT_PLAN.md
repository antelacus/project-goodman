# Project Goodman V3 Development Plan

This document captures ideas and plans for Version 3 development. These features require fundamental architectural changes and will be implemented after V2 is complete.

---

## Table of Contents

1. [Management Financial Statement System](#1-management-financial-statement-system)
2. [Intelligent Document System](#2-intelligent-document-system)
3. [VPS Migration](#3-vps-migration)
4. [Security Enhancements](#4-security-enhancements)

---

## 1. Management Financial Statement System

### Overview

Implement the **管理用财报体系** (Management Financial Statement System) which reconstructs traditional financial statements for deeper analysis.

### Background Discussion (2024-12-03)

We analyzed whether current financial data is sufficient to construct management system indicators. Key findings:

#### Data Availability Analysis

| Category | Indicators | Data Status |
|----------|------------|-------------|
| **Balance Sheet Reconstruction** | 净经营资产, 净负债 | ⚠️ Requires operating/financial classification logic |
| **Income Statement Reconstruction** | 税前经营利润, 税后经营净利润, 税后利息费用 | ✅ Available (tax rate can be calculated) |
| **Cash Flow Reconstruction** | 营业现金毛流量, 营业现金净流量, 实体现金流量 | ❌ Needs 折旧与摊销, period comparison |
| **Management Ratios** | 净经营资产净利率, 税后利息率, 净财务杠杆, 管理用ROE | ⚠️ Depends on above |

#### Key Challenges Identified

1. **Operating vs Financial Classification**
   - Need business logic to classify assets/liabilities
   - 金融资产: 货币资金, 交易性金融资产, 债权投资, etc.
   - 金融负债: 短期借款, 长期借款, 应付债券, etc.
   - 经营资产: 应收账款, 存货, 固定资产, etc.
   - 经营负债: 应付账款, 预收款项, 应付职工薪酬, etc.

2. **Depreciation & Amortization (折旧与摊销)**
   - Not directly available in standard financial statements
   - Found in 财务报表附注 (Notes to Financial Statements)
   - Requires text-based extraction from annual reports

3. **Period Comparison Data**
   - Metrics like "净经营资产增加" need data from two periods
   - Solution: Database already supports `metric_value_previous` column
   - Need to ensure extraction populates both periods

4. **Tax Rate Calculation**
   - Can be calculated: `所得税费用 / 利润总额`
   - Need edge case handling for negative profits

#### Formulas to Implement

**Balance Sheet Reconstruction:**
```
净经营资产 = 经营资产 - 经营负债 = 净负债 + 股东权益
净负债 = 金融负债 - 金融资产
```

**Income Statement Reconstruction:**
```
税前经营利润 = 营业收入 - 营业成本 - 税金及附加 - 销售/管理费用 (不含利息)
税后经营净利润 = 税前经营利润 × (1 - 所得税税率)
税后利息费用 = 利息费用 × (1 - 所得税税率)
```

**Cash Flow Reconstruction:**
```
营业现金毛流量 = 税后经营净利润 + 折旧与摊销
营业现金净流量 = 营业现金毛流量 - 经营营运资本增加
实体现金流量 = 营业现金净流量 - 资本支出
融资现金流量 = 债务现金流量 + 股权现金流量
```

**Management Ratios:**
```
净经营资产净利率 = 税后经营净利润 / 净经营资产
税后利息率 = 税后利息费用 / 净负债
净财务杠杆 = 净负债 / 股东权益
管理用ROE = 净经营资产净利率 + (净经营资产净利率 - 税后利息率) × 净财务杠杆
```

### Implementation Dependencies

This feature depends on [Intelligent Document System](#2-intelligent-document-system) because:
- 折旧与摊销 data is in text-based annual reports
- AI needs to automatically find and extract this data
- Multi-period comparison requires smart document selection

### Proposed Implementation Phases

1. **Phase 1**: Implement asset/liability classification logic
2. **Phase 2**: Add income statement reconstruction (feasible with current data)
3. **Phase 3**: Integrate with Intelligent Document System for cash flow reconstruction
4. **Phase 4**: Complete management ratios and 管理用ROE

---

## 2. Intelligent Document System

### Overview

Replace manual document selection with AI-powered automatic document discovery and selection.

### Background Discussion (2024-12-03)

Two key insights drove this design:

1. **Multi-Period Data**: Chinese financial statements typically include both current and prior year columns (本期金额, 上期金额). Instead of storing separately, AI should understand and extract both periods from the same document.

2. **Text-Based Financial Data**: Documents like "2024年度财务报告" contain critical data (折旧与摊销) in text form within 财务报表附注. AI needs to automatically find and extract from these documents.

### Current Architecture (V2)

```
User → Manually selects documents → AI extracts from selected docs → Calculate
```

**Limitations:**
- User must know which document contains what data
- Cannot combine structured tables with text notes
- Manual selection is tedious for complex calculations

### Proposed Architecture (V3) - Option C: Smart Default

**Decision**: Implement Option C (Smart Default with Override)

```
┌─────────────────────────────────────────────────────────────┐
│  User Question: "计算2024年的营业现金毛流量"                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: AI Understands Data Requirements                   │
│  - 税后经营净利润 (from income statement)                    │
│  - 折旧与摊销 (from financial notes/annual report)          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: AI Searches Documents (Vector + Keyword)           │
│  Query: "2024 折旧 摊销 固定资产"                            │
│  Results:                                                   │
│    - 2024年度财务报告.pdf (score: 0.92)                      │
│    - 2024利润表.xlsx (score: 0.85)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: AI Extracts Data from Multiple Sources             │
│  From 利润表: 税后经营净利润 = 600,000                       │
│  From 年度报告附注: 折旧与摊销 = 150,000                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Calculate & Show Sources                           │
│  营业现金毛流量 = 600,000 + 150,000 = 750,000               │
│  Sources: [利润表.xlsx, 年度报告.pdf]                        │
│  [User can override document selection if needed]           │
└─────────────────────────────────────────────────────────────┘
```

### Existing Infrastructure (Already Built in V2)

| Component | Status | Notes |
|-----------|--------|-------|
| Vector embeddings | ✅ Exists | `document_chunks.embedding` column |
| Multi-period storage | ✅ Exists | `financial_data.metric_value_previous` column |
| Semantic search | ✅ Exists | Can query `document_chunks` by similarity |
| Keywords | ✅ Exists | `document_chunks.keywords` column |

### New Components Needed

1. **New Document Types**
   ```typescript
   'annual_report'     // 年度财务报告 (comprehensive)
   'financial_notes'   // 财务报表附注 (detailed notes)
   ```

2. **Document Search API**
   - Input: data requirements (metric names, year, keywords)
   - Output: ranked list of relevant documents
   - Uses vector similarity + keyword matching

3. **Multi-Document Extraction**
   - Extract from structured tables (Excel)
   - Extract from text notes (PDF/Word)
   - Combine data from multiple sources

4. **Source Transparency UI**
   - Show which documents AI selected
   - Allow user to override/add documents
   - Display confidence scores

### Implementation Tasks

1. Add new document types to `document-constants.ts`
2. Create document search API endpoint
3. Enhance extraction to handle text-based notes
4. Update financial analysis API to auto-search documents
5. Add source display and override UI
6. Ensure multi-period extraction works correctly

---

## 3. VPS Migration

### Overview

Migrate from Vercel (free tier) to a VPS for better control over compute resources as the project grows.

### Motivation

- Increasing computation requirements (AI extraction, vector search)
- Vercel free tier limitations (function timeout, memory)
- Need for background jobs (document processing)
- Better cost control at scale

### Current Vercel Limitations (Free Tier)

| Limitation | Free Tier | Impact |
|------------|-----------|--------|
| Serverless Function Timeout | 10 seconds | Long AI extractions may fail |
| Serverless Function Memory | 1024 MB | Large document processing limited |
| Edge Function Duration | 30 seconds | OK for most operations |
| Bandwidth | 100 GB/month | May hit limits with file uploads |
| Build Time | 45 minutes | Sufficient |
| Concurrent Builds | 1 | Sufficient |

### Migration Difficulty Analysis

#### Easy Parts ✅

1. **Next.js on VPS**: Standard deployment
   - Next.js runs natively on Node.js
   - Can use PM2 for process management
   - No code changes needed

2. **Database (Supabase)**: No migration needed
   - Supabase is already external
   - Just update connection strings if needed

3. **Environment Variables**: Simple transfer
   - Copy `.env` to VPS
   - Use systemd or PM2 for env management

#### Medium Difficulty ⚠️

1. **Reverse Proxy Setup**
   - Need Nginx or Caddy configuration
   - SSL certificate management (Let's Encrypt)
   - Domain DNS configuration

2. **File Storage**
   - Currently using Supabase Storage
   - No change needed, but could move to local storage for speed

3. **Background Jobs**
   - Currently limited by serverless
   - On VPS: can use Bull/BullMQ with Redis
   - Better for long-running document processing

#### Considerations 🤔

1. **DevOps Overhead**
   - Need to manage server updates
   - Monitor uptime
   - Handle scaling manually

2. **Cost Comparison**
   | Option | Monthly Cost | Notes |
   |--------|--------------|-------|
   | Vercel Free | $0 | Limited, may hit walls |
   | Vercel Pro | $20 | Better limits |
   | VPS (Basic) | $5-10 | Full control, DigitalOcean/Vultr |
   | VPS (Good) | $20-40 | More RAM/CPU for AI tasks |

3. **Deployment Pipeline**
   - Need to set up CI/CD (GitHub Actions → VPS)
   - Or manual deployment with git pull

### Recommended VPS Specifications

For this project's requirements:

| Spec | Minimum | Recommended |
|------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| Bandwidth | 2 TB | 4 TB |

**Estimated Cost**: $20-40/month (DigitalOcean, Vultr, or Hetzner)

### Migration Steps

1. **Provision VPS**
   - Choose provider (DigitalOcean, Vultr, Hetzner, AWS Lightsail)
   - Install Ubuntu 22.04 LTS

2. **Install Dependencies**
   ```bash
   # Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs

   # PM2
   npm install -g pm2

   # Nginx
   sudo apt install -y nginx
   ```

3. **Deploy Application**
   ```bash
   git clone <repo>
   npm install
   npm run build
   pm2 start npm --name "goodman" -- start
   ```

4. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **SSL with Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

6. **Set Up CI/CD** (Optional)
   - GitHub Actions workflow for auto-deploy
   - Or simple webhook-based deployment

### Verdict

**Difficulty: Medium** - Not hard, but requires some DevOps knowledge.

**Recommendation**:
- If comfortable with Linux/server management: Migrate to VPS
- If prefer managed: Consider Vercel Pro ($20/month) first
- Can start with cheap VPS ($10/month) and scale up

---

## Version 3 Roadmap

### Priority Order

1. **VPS Migration** (Foundation)
   - Removes compute limitations
   - Enables longer processing times
   - Required for heavy AI operations

2. **Intelligent Document System** (Core Feature)
   - Transforms user experience
   - Required for Management Financial System
   - Biggest architectural change

3. **Management Financial Statement System** (Advanced Feature)
   - Builds on Intelligent Document System
   - Completes financial analysis capabilities
   - Differentiating feature

### Timeline Estimate

| Phase | Feature | Duration |
|-------|---------|----------|
| V3.0 | VPS Migration | 1-2 days |
| V3.1 | Intelligent Document System | 1-2 weeks |
| V3.2 | Management Financial System | 1 week |

---

## 4. Security Enhancements

### Overview

Security improvements identified during V2 Phase 6 audit. These are recommended for production deployment beyond MVP demo.

### Background (2025-12-03)

During V2 deployment preparation, a comprehensive security audit was conducted. The following improvements were identified but deferred to V3 to allow MVP deployment.

### Current State (V2 MVP)

**Implemented**:
- ✅ RLS enabled on all 7 tables
- ✅ Admin password verification
- ✅ Service key server-side only
- ✅ Supabase parameterized queries (SQL injection protection)
- ✅ Client-side rate limiting (localStorage)

**Known Limitations**:
- ⚠️ No server-side rate limiting
- ⚠️ Plain text password comparison (no bcrypt)
- ⚠️ Detailed error messages exposed in API responses
- ⚠️ No input length validation
- ⚠️ Missing security headers

### Security Enhancements Roadmap

#### Tier 1: Critical (Production Required)

| Enhancement | Description | Implementation |
|-------------|-------------|----------------|
| **Server-side Rate Limiting** | Prevent API abuse and DoS | Use Redis + `rate-limiter-flexible` |
| **Input Length Validation** | Prevent oversized requests | Add max length checks to all string inputs |
| **Error Message Sanitization** | Prevent information disclosure | Remove `details` field from error responses |

**Implementation Details - Rate Limiting**:
```typescript
// Example: Redis-based rate limiting
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 10,        // 10 requests
  duration: 60,      // per 60 seconds
  blockDuration: 60, // block for 60 seconds if exceeded
});

// Apply to all API routes
export async function rateLimit(ip: string) {
  try {
    await rateLimiter.consume(ip);
    return true;
  } catch {
    return false; // Rate limited
  }
}
```

#### Tier 2: High Priority

| Enhancement | Description | Implementation |
|-------------|-------------|----------------|
| **Password Hashing** | Store hashed passwords | Use bcrypt for ADMIN_PASSWORD |
| **Session Tokens** | Replace per-request password auth | JWT or secure session cookies |
| **Brute Force Protection** | Lock after failed attempts | Exponential backoff + account lockout |
| **File Path Validation** | Prevent path traversal | Validate `fileUrl` parameter in preview API |

**Implementation Details - Password Hashing**:
```typescript
// Store hashed password in env/db
// At startup or setup:
const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

// Verification:
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  return bcrypt.compare(password, storedHash);
}
```

#### Tier 3: Medium Priority

| Enhancement | Description | Implementation |
|-------------|-------------|----------------|
| **Security Headers** | CORS, CSP, X-Frame-Options | Next.js middleware or `next.config.js` |
| **File Content Validation** | Magic number checks | Validate file signatures before processing |
| **Audit Logging** | Track admin operations | Log to database with timestamp, action, result |
| **Function Search Path** | Fix Supabase warnings | Add `SET search_path = public` to functions |

**Implementation Details - Security Headers**:
```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

### Database Security Fixes

**Function Search Path** (6 functions to fix):
```sql
-- Example fix for search_financial_data
CREATE OR REPLACE FUNCTION public.search_financial_data(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Add this line
AS $$
BEGIN
  ...
END;
$$;
```

**Functions to update**:
1. `search_financial_data`
2. `search_regulations_hybrid`
3. `get_financial_metrics_by_year`
4. `match_documents`
5. `get_document_with_chunks`
6. `get_documents_by_category`

### Dependencies

| Enhancement | Requires |
|-------------|----------|
| Server-side rate limiting | Redis (or Upstash Redis for serverless) |
| Session tokens | Redis for session storage |
| Audit logging | New database table |

### Integration with VPS Migration

If migrating to VPS (Section 3), security enhancements become easier:
- Redis can run locally on VPS
- No serverless constraints on session management
- Better logging and monitoring options

### Priority for V3 Implementation

1. **V3.0 (with VPS)**: Rate limiting + Error sanitization
2. **V3.1**: Password hashing + Session tokens
3. **V3.2**: Security headers + Audit logging
4. **V3.3**: Database function fixes + File validation

---

## Notes & Ideas

(Space for future ideas as they come up)

- Consider adding user authentication if deploying publicly
- Explore caching strategies for repeated calculations
- Consider WebSocket for real-time extraction progress
