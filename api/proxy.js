// Vercel serverless function. Lives at /api/proxy and is called as
// /api/proxy?path=/api/anime&q=...  (same query-param shape the old proxy.php used).
//
// IMPORTANT: set MAL_CLIENT_ID as an Environment Variable in your Vercel project
// settings (Project -> Settings -> Environment Variables). Do not hardcode it here.
module.exports = async (req, res) => {
    const clientId = process.env.MAL_CLIENT_ID;

    if (!clientId) {
        res.status(500).json({ error: 'Server is missing MAL_CLIENT_ID configuration' });
        return;
    }

    const { path, ...rest } = req.query;

    if (!path) {
        res.status(400).json({ error: 'Missing path' });
        return;
    }

    if (!path.startsWith('/api/anime')) {
        res.status(404).json({ error: 'Not Found' });
        return;
    }

    const targetPath = path.replace('/api/anime', '/v2/anime');

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(rest)) {
        if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v));
        } else if (value !== undefined) {
            params.append(key, value);
        }
    }

    const queryString = params.toString();
    const targetUrl = `https://api.myanimelist.net${targetPath}${queryString ? `?${queryString}` : ''}`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'X-MAL-CLIENT-ID': clientId,
                Accept: 'application/json'
            }
        });

        const data = await response.text();

        // Same-origin on Vercel, so this isn't strictly required, but it's harmless
        // to keep in case you ever call this API from elsewhere during testing.
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');
        res.status(response.status).send(data);
    } catch (error) {
        res.status(502).json({ error: error.message });
    }
};
