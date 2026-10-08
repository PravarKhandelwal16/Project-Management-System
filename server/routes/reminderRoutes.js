const router = require('express').Router();
const controller = require('../controllers/reminderController');
router.use(require('../middleware/authMiddleware'));
router.get('/',controller.list);
router.post('/',controller.create);
router.put('/:id',controller.update);
router.delete('/:id',controller.remove);
module.exports = router;
