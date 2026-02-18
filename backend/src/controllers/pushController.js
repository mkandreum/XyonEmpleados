const { saveSubscription, deleteSubscription, getPublicKey } = require('../services/pushService');

const respondMissingKeys = (res) => res.status(503).json({ error: 'Push service not configured' });

exports.getVapidPublicKey = (req, res) => {
    const key = getPublicKey();
    if (!key) return respondMissingKeys(res);
    res.json({ publicKey: key });
};

exports.saveSubscription = async (req, res) => {
    try {
        const userId = req.user.userId;
        const subscription = req.body;

        await saveSubscription(userId, subscription);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving push subscription:', error);
        res.status(400).json({ error: 'Failed to save subscription' });
    }
};

exports.deleteSubscription = async (req, res) => {
    try {
        const { endpoint } = req.body || {};
        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint is required' });
        }
        await deleteSubscription(endpoint);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting push subscription:', error);
        res.status(400).json({ error: 'Failed to delete subscription' });
    }
};
