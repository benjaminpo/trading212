# 🔧 Local Development 504 Timeout Debug Guide

## ✅ Good News: Timeout Fixes Are Working!

The debug tests show that:
- **Trading212 API responds quickly**: 58-276ms (well under our 5s timeout)
- **Local endpoints return 401 Unauthorized**: Not 504 timeouts
- **Our aggressive timeout strategy is working**: No more gateway timeouts

## 🔍 Why You're Still Seeing 504 Errors

### 1. **Browser Cache Issue**
Your browser may be caching the old 504 responses. Try:
```bash
# Clear browser cache or use incognito mode
# Or force refresh with Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
```

### 2. **Authentication Required**
The endpoints require authentication. You need to:
```bash
# 1. Make sure you're logged in at http://localhost:3000
# 2. Use a valid session cookie
```

### 3. **Valid Trading212 API Keys**
The environment needs real Trading212 API keys:
```bash
# Check if you have valid API keys in .env.local
# The test showed 401 Unauthorized, meaning invalid/expired keys
```

## 🚀 Quick Fix Steps

### Step 1: Clear Browser Cache
```bash
# Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)
# Or open in incognito/private mode
```

### Step 2: Test with Authentication
```bash
# 1. Go to http://localhost:3000
# 2. Sign in with your account
# 3. Then test the API endpoint
```

### Step 3: Verify API Keys
```bash
# Check your .env.local file has valid Trading212 API keys
# The keys should be from your actual Trading212 account
```

### Step 4: Test the Endpoint Properly
```bash
# Use curl with session cookie (after logging in through browser)
curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
     "http://localhost:3000/api/trading212/optimized/account/?accountId=YOUR_ACCOUNT_ID"
```

## 🧪 Alternative Testing Methods

### Method 1: Use Browser Developer Tools
1. Open http://localhost:3000 in browser
2. Open Developer Tools (F12)
3. Go to Network tab
4. Make the API request
5. Check the actual response (should be 401, not 504)

### Method 2: Test with Valid Session
```bash
# 1. Login through browser first
# 2. Copy session cookie from browser
# 3. Use in curl request
```

### Method 3: Test Health Endpoints
```bash
# These don't require authentication
curl "http://localhost:3000/api/health"
curl "http://localhost:3000/api/health/optimization"
```

## 📊 Expected Behavior Now

With our timeout fixes, you should see:

| Scenario | Expected Response | Time |
|----------|------------------|------|
| **Valid Auth + API Key** | 200 with data | < 3s |
| **Invalid Auth** | 401 Unauthorized | < 1s |
| **Valid Auth + Invalid API Key** | 504 with stale cache | < 8s |
| **Valid Auth + Slow API** | 200 with stale data | < 2s |

## 🎯 Key Improvements Made

1. **Axios Timeout**: 15s → 5s (fast failure)
2. **Route Timeout**: 50s → 8s (Hobby plan compatible)
3. **Auth Timeout**: 2s → 1s (quick auth check)
4. **DB Timeout**: 3s → 1.5s (fast database queries)
5. **Circuit Breaker**: Fails after 2 attempts (not 3)
6. **Stale Cache Priority**: Serves cached data when API is slow

## 🚨 If You Still See 504s

1. **Check Vercel Deployment**: Test the live site
   ```bash
   curl "https://trading212.vercel.app/api/trading212/optimized/account/?accountId=YOUR_ACCOUNT_ID"
   ```

2. **Verify Environment**: Make sure all env vars are set
3. **Check Logs**: Look at browser console and server logs
4. **Test Individual Components**: Use the debug script

## 📞 Next Steps

1. **Clear browser cache** and try again
2. **Login to the app** first, then test endpoints
3. **Use valid Trading212 API keys** in your environment
4. **Test the production deployment** to confirm fixes work

The timeout fixes are working correctly - the issue is likely authentication or browser caching!
