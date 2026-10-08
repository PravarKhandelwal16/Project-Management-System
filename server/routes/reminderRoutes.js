const router = require('express').Router();
const controller = require('../controllers/reminderController');
const { bodyFields } = require('../middleware/inputValidation');
router.use(require('../middleware/authMiddleware'));
router.get('/',controller.list);
router.post('/',bodyFields('title','notes','remind_at','task_id'),controller.create);
router.put('/:id',bodyFields('title','notes','remind_at','task_id','status'),controller.update);
router.delete('/:id',controller.remove);
module.exports = router;
