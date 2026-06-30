const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:8001/auth/login', {
      email: 'demo-user@assetflow.com',
      password: 'assetflow123'
    });
    const token = loginRes.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log("Fetching summary...");
    const summary = await axios.get('http://localhost:8001/transactions/summary', { headers });
    
    console.log("Fetching trend...");
    const trend = await axios.get('http://localhost:8001/transactions/monthly-trend', { headers });
    
    console.log("Fetching txns...");
    const txns = await axios.get('http://localhost:8001/transactions/?limit=100', { headers });

    console.log("Txns count:", txns.data.length);
    if (txns.data.length > 0) {
      const mlPayload = { transactions: txns.data.map(t => ({
        amount: t.amount || 0, 
        merchant: t.merchant || '', 
        description: t.description || '', 
        category: t.category || 'Other', 
        timestamp: t.timestamp || new Date().toISOString()
      }))};
      
      console.log("Fetching ml insights...");
      const insights = await axios.post('http://localhost:8005/predict/expense-insights', mlPayload);
      
      console.log("Fetching ml anomalies...");
      const anomalies = await axios.post('http://localhost:8005/predict/anomalies', mlPayload);
      console.log("Success!");
    } else {
      console.log("No txns.");
    }
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
test();
