const router = require('express').Router();
const publicController = require('../controllers/publicController');
router.get('/', publicController.home);
router.get('/share/fraternity-shirt', publicController.sharePage);
module.exports = router;
