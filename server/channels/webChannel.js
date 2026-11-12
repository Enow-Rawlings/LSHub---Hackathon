/**
 * Web channel route for the bot simulator.
 * POST /api/bot/web
 */
const router  = require('express').Router();
const { handleMessage } = require('../bot/engine');

router.post('/', async (req, res, next) => {
  try {
    const { userKey, text, buttonId, location } = req.body;

    if (!userKey) {
      return res.status(400).json({ error: 'userKey (phone number) is required' });
    }

    const result = await handleMessage({
      channel:  'web',
      userKey:  String(userKey),
      messageId: `web_${Date.now()}`,
      text:     text || '',
      buttonId: buttonId || null,
      location: location || null,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
