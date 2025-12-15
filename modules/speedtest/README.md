# ⚡ Speedtest Module

**Network and API performance testing**

## Features

- ✅ Latency measurement
- ✅ API endpoint monitoring
- ✅ Real-time metrics
- ✅ Historical data
- ✅ Performance charts
- ✅ Export reports

## Integration

```javascript
import Speedtest from './modules/speedtest/frontend/components/Speedtest';

<Speedtest 
  endpoints={[
    { name: 'Gemini API', url: 'https://generativelanguage.googleapis.com' },
    { name: 'OpenRouter', url: 'https://openrouter.ai' }
  ]}
/>
```

## Metrics

- **Latency**: Round-trip time
- **Throughput**: Requests per second
- **Availability**: Uptime percentage
- **Response Time**: P50, P95, P99

## API

**GET** `/api/speedtest/ping` - Ping test
**GET** `/api/speedtest/metrics` - Get metrics

[See full documentation](./docs/API.md)
