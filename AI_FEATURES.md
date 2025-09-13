# AI-Powered Exit Strategy Recommendations

This document describes the AI-powered features that provide intelligent exit strategy recommendations for your Trading212 positions.

## Overview

The AI system analyzes your positions daily and provides personalized exit strategy recommendations based on:
- Position performance (P/L, P/L%)
- Market data and price movements
- Risk levels and user preferences
- Technical indicators and trends

## Features

### 1. Daily Automated Analysis
- **Automatic Scheduling**: Runs daily at market close (4:00 PM EST)
- **Multi-User Support**: Analyzes all connected users automatically
- **Error Handling**: Robust error handling with detailed logging
- **Rate Limiting**: Built-in delays to respect API limits

### 2. AI Recommendation Types
- **EXIT**: Sell the entire position
- **HOLD**: Maintain current position
- **REDUCE**: Sell a portion of the position
- **INCREASE**: Buy more shares (if conditions are favorable)

### 3. Risk Assessment
- **LOW Risk**: Conservative recommendations with higher confidence
- **MEDIUM Risk**: Balanced approach considering multiple factors
- **HIGH Risk**: Positions requiring immediate attention

### 4. Timeframe Analysis
- **SHORT**: Immediate action recommended (1-7 days)
- **MEDIUM**: Monitor and act within weeks (1-4 weeks)
- **LONG**: Long-term position management (1-3 months)

## Database Schema

### Positions Table
Stores current position data fetched from Trading212:
```sql
- symbol: Stock ticker
- quantity: Number of shares
- averagePrice: Average purchase price
- currentPrice: Current market price
- pnl: Profit/Loss in dollars
- pnlPercent: Profit/Loss percentage
- marketValue: Current market value
```

### AI Recommendations Table
Stores AI analysis results:
```sql
- recommendationType: EXIT|HOLD|REDUCE|INCREASE
- confidence: 0-1 confidence score
- reasoning: AI explanation
- suggestedAction: Specific action steps
- targetPrice: Suggested target price
- stopLoss: Recommended stop loss
- riskLevel: LOW|MEDIUM|HIGH
- timeframe: SHORT|MEDIUM|LONG
```

### Analysis Logs Table
Tracks analysis execution:
```sql
- analysisType: DAILY_REVIEW|ON_DEMAND|POSITION_SPECIFIC
- totalPositions: Number of positions analyzed
- recommendations: Number of recommendations generated
- executionTime: Analysis duration in milliseconds
- success: Whether analysis completed successfully
```

## AI Service Integration

### OpenAI Integration
- **Model**: GPT-4 Turbo for advanced analysis
- **Fallback**: Rule-based analysis if OpenAI unavailable
- **Prompt Engineering**: Structured prompts for consistent results
- **Response Parsing**: JSON-based response format

### Rule-Based Fallback
When OpenAI is unavailable, the system uses rule-based logic:
- **Profit Taking**: Exit when gains > 20% and near 52-week high
- **Loss Cutting**: Exit when losses > 15%
- **Conservative Approach**: Reduce positions for conservative users
- **Risk Management**: Set stop-losses based on volatility

## API Endpoints

### `/api/ai/analyze-positions`
- **POST**: Run AI analysis for current user
- **GET**: Fetch existing recommendations

### `/api/ai/daily-analysis`
- **POST**: Manually trigger daily analysis
- **GET**: Get analysis execution logs

## Configuration

### Environment Variables
```env
OPENAI_API_KEY="your-openai-api-key"
```

### Risk Profiles
Users can be configured with different risk profiles:
- **CONSERVATIVE**: Focus on capital preservation
- **MODERATE**: Balanced growth and risk (default)
- **AGGRESSIVE**: Higher risk tolerance for growth

## Usage

### Dashboard Integration
- **AI Recommendations Card**: Shows count of active recommendations
- **Quick Access**: Direct link to AI recommendations page
- **Status Indicators**: Visual indicators for recommendation urgency

### AI Recommendations Page
- **Summary View**: Overview of all recommendation types
- **Detailed Cards**: Individual position analysis with reasoning
- **Action Buttons**: Quick access to execute recommendations
- **Feedback System**: Users can rate recommendation quality

### Manual Analysis
Users can trigger on-demand analysis:
```javascript
// Run analysis for current user
await fetch('/api/ai/analyze-positions', { method: 'POST' })
```

## Daily Scheduler

### Automatic Execution
- **Time**: 9:00 PM UTC (4:00 PM EST) - after market close
- **Frequency**: Every 24 hours
- **User Coverage**: All users with Trading212 connections
- **Error Recovery**: Individual user failures don't stop batch processing

### Manual Control
```javascript
import { dailyScheduler } from '@/lib/scheduler'

// Start scheduler
dailyScheduler.start()

// Stop scheduler
dailyScheduler.stop()

// Analyze specific user
await dailyScheduler.analyzeUser(userId)
```

## Performance Considerations

### Rate Limiting
- **Trading212 API**: 5-second delays between users
- **OpenAI API**: 100ms delays between position analyses
- **Batch Processing**: Processes users sequentially to avoid overload

### Error Handling
- **API Failures**: Graceful degradation to rule-based analysis
- **Network Issues**: Retry logic with exponential backoff
- **Data Validation**: Input sanitization and validation
- **Logging**: Comprehensive error logging for debugging

## Security

### API Key Management
- **Encryption**: Trading212 API keys encrypted in database
- **Scope Limitation**: Only read access to position data
- **User Isolation**: Each user's data processed independently

### Data Privacy
- **Local Processing**: AI analysis runs on your infrastructure
- **No Data Sharing**: Position data not shared with third parties
- **Audit Trail**: Complete logging of all analysis activities

## Future Enhancements

### Planned Features
1. **Custom Risk Profiles**: User-configurable risk preferences
2. **Sector Analysis**: Industry-specific recommendations
3. **Portfolio Optimization**: Whole-portfolio rebalancing suggestions
4. **Integration Webhooks**: Real-time notifications for urgent recommendations
5. **Machine Learning**: Learn from user feedback to improve recommendations
6. **Advanced Charting**: Technical analysis integration
7. **Backtesting**: Historical performance analysis of recommendations

### Integration Opportunities
- **Email Notifications**: Daily summary emails
- **Mobile Push Notifications**: Urgent recommendation alerts
- **Slack/Discord Bots**: Team trading notifications
- **Calendar Integration**: Schedule review meetings for recommendations

## Troubleshooting

### Common Issues

1. **No Recommendations Generated**
   - Check Trading212 API connection
   - Verify positions exist in account
   - Check OpenAI API key configuration

2. **Analysis Fails**
   - Review API rate limits
   - Check network connectivity
   - Verify database connectivity

3. **Incorrect Recommendations**
   - Validate market data accuracy
   - Check AI prompt configuration
   - Review rule-based fallback logic

### Debug Mode
Enable detailed logging by setting:
```env
NODE_ENV=development
```

This will provide verbose logging of:
- API calls and responses
- AI analysis prompts and responses
- Database operations
- Scheduler execution details
