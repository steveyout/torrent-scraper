import express from 'express';
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // Pass a more descriptive title for your new service
  res.render('index', { title: 'Youplex Torrent Streamer' });
});

export default router;
