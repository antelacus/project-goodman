# Project Goodman - Deployment Checklist

**Version**: V2.0
**Last Updated**: 2025-12-03
**Target Platform**: Vercel + Supabase

---

## Pre-Deployment Verification

### 1. Environment Variables

Ensure the following environment variables are set in Vercel:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key for GPT-4.1 and embeddings |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role key (keep secure!) |
| `ADMIN_PASSWORD` | ✅ Yes | Admin password for database uploads (use strong password!) |

**Important**:
- Use a strong `ADMIN_PASSWORD` in production (not the development password)
- Never commit `.env.local` to version control

### 2. Database Status

| Item | Status | Notes |
|------|--------|-------|
| All migrations applied | ✅ | 7 migrations total |
| RLS enabled on all tables | ✅ | Basic permissive policies for MVP |
| Vector extension installed | ✅ | v0.8.0 |
| Storage bucket created | ✅ | `document-files` bucket |
| Database functions created | ✅ | `match_documents`, `search_financial_data`, etc. |

### 3. Build Verification

```bash
# Run locally before deploying
npm run build
```

Expected: Build completes without errors.

---

## Vercel Deployment Steps

### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import the GitHub repository
3. Select the `main` branch for production

### Step 2: Configure Environment Variables

In Vercel project settings → Environment Variables:

```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_PASSWORD=<strong-production-password>
```

### Step 3: Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 20.x |

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Verify deployment at the generated URL

---

## Post-Deployment Verification

### Functional Testing Checklist

- [ ] **Homepage**: Landing page loads, chat interface works
- [ ] **Data Extract**: File upload and extraction works
- [ ] **Financial Analysis**: Document selection and calculations work
- [ ] **Guidance Chat**: Hybrid search and citations work
- [ ] **Admin Mode**: Triple-click unlock and database upload work
- [ ] **Document Management**: List, preview, edit, delete work

### API Endpoints to Test

| Endpoint | Method | Test |
|----------|--------|------|
| `/api/landing-chat` | POST | Send a test question |
| `/api/data-extract` | POST | Upload a test PDF |
| `/api/financial-analysis-v2` | POST | Query a financial ratio |
| `/api/guidance-chat-v2` | POST | Ask a compliance question |
| `/api/documents` | GET | List all documents |
| `/api/preset-functions` | GET | List available functions |

### Performance Check

- [ ] Page load time < 3s
- [ ] API response time < 10s (for AI calls)
- [ ] No console errors in browser

---

## Monitoring & Maintenance

### Cost Monitoring

| Service | Monitor | Free Tier Limit |
|---------|---------|-----------------|
| OpenAI | [platform.openai.com](https://platform.openai.com/usage) | Pay as you go |
| Supabase | Dashboard → Usage | 500MB storage, 5GB bandwidth |
| Vercel | Dashboard → Usage | 100GB bandwidth |

### Key Metrics to Watch

1. **OpenAI API Costs**
   - GPT-4.1 calls (financial analysis, guidance)
   - GPT-4o-mini calls (landing page routing)
   - Embedding calls (document vectorization)

2. **Supabase Usage**
   - Database storage (structured + vector data)
   - File storage (document-files bucket)
   - API requests

3. **Vercel Usage**
   - Function invocations
   - Bandwidth consumption

### Supabase Auto-Pause

**Important**: Supabase free tier pauses after 7 days of inactivity.
- First request after pause takes ~10s to wake up
- Consider upgrading for production use

---

## Security Checklist

- [x] RLS enabled on all tables
- [x] Admin password required for sensitive operations
- [x] Service role key only on server-side
- [x] No secrets in client-side code
- [ ] Consider rate limiting for production
- [ ] Consider Redis for session storage (if scaling)

### Security Warnings (Acceptable for MVP)

The following warnings are acknowledged and acceptable for MVP deployment:

1. **Function search_path mutable** (6 functions)
   - Low risk for single-tenant demo
   - Fix by adding `SET search_path = public` to functions

2. **Extension in public schema** (vector)
   - Standard Supabase setup
   - Can be moved to `extensions` schema if needed

---

## Rollback Plan

If deployment fails:

1. **Vercel**: Use "Redeploy" on previous successful deployment
2. **Database**: Migrations are forward-only; backup before major changes

---

## Seed Data (Optional)

After deployment, upload knowledge base documents via admin mode:

1. Access `/data-extract`
2. Triple-click the 📄 icon to unlock admin mode
3. Enter the admin password
4. Upload financial statements and regulations

### Recommended Initial Documents

- Sample balance sheet (资产负债表)
- Sample income statement (利润表)
- Sample cash flow statement (现金流量表)
- Tax regulations (增值税法, 企业所得税法)
- Accounting standards (企业会计准则)

---

## Support & Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Database connection failed" | Check Supabase URL and service key |
| "OpenAI API error" | Verify API key and billing status |
| "Admin mode not unlocking" | Check ADMIN_PASSWORD env var |
| "Upload failed" | Check file size (< 2MB) and format |
| "Slow response" | Supabase may be waking from pause |

### Logs

- **Vercel Logs**: Dashboard → Deployments → Logs
- **Supabase Logs**: Dashboard → Logs
- **Browser Console**: F12 → Console tab

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| V2.0 | 2025-12-03 | Initial production deployment |

---

*Generated for Project Goodman V2 deployment*
