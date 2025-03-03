// Fadex25/server.ts
import express, { Request, Response } from 'express';
import path from 'path';
import cors, { CorsOptions } from 'cors';

const app = express();
const port = 4000;

// Enable CORS for localhost:3000
const corsOptions: CorsOptions = {
  origin: 'http://localhost:3000'
};
app.use(cors(corsOptions));

// Serve React build (comment out or remove if no build exists yet)
app.use(express.static(path.join(__dirname, 'fadex25-ui', 'build')));

// API endpoint for Perp markets
app.get('/api/perp-markets', async (req: Request, res: Response) => {
  console.log('Requesting /api/perp-markets');
  try {
    const module = await import('./api/getPerpMarkets');
    const { getPerpMarkets } = module;
    const markets = await getPerpMarkets();
    console.log('Markets fetched from server:', markets);
    res.json(markets);
  } catch (error: any) {
    console.error('Server error fetching Perp markets:', error);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('Check if api/getPerpMarkets.ts exists in Fadex25/api/');
    }
    res.status(500).json({ error: 'Failed to fetch Perp markets' });
  }
});

// API endpoint for TradingView indicators
app.get('/api/indicators', (req: Request, res: Response) => {
  console.log('Requesting /api/indicators');
  try {
    const module = require('./api/TVdefaultindicators');
    const { tvDefaultIndicators } = module;
    console.log('Indicators fetched:', tvDefaultIndicators);
    res.json(tvDefaultIndicators);
  } catch (error: any) {
    console.error('Server error fetching indicators:', error);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('Check if api/TVdefaultindicators.ts exists in Fadex25/api/');
    }
    res.status(500).json({ error: 'Failed to fetch indicators' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});