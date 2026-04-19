const express = require('express');
const router = express.Router();
const Stats = require('../models/Stats');

// POST /api/stats/view
// Body: { id, name, type, logo, group, streamUrl }
router.post('/view', async (req, res) => {
    try {
        const item = req.body;
        if (!item || !item.id) {
            return res.status(400).json({ error: 'Item data with ID is required' });
        }
        
        await Stats.incrementView(item);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[STATS ERROR]', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/stats/highlights
router.get('/highlights', async (req, res) => {
    try {
        const channels = await Stats.getTop(15, 'channel');
        const movies = await Stats.getTop(15, 'movie');
        const series = await Stats.getTop(15, 'series');

        res.status(200).json({
            channels,
            movies,
            series
        });
    } catch (error) {
        console.error('[STATS ERROR]', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
