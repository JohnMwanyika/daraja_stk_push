var express = require("express");
var router = express.Router();
const { billForm, getBillApi, createBill } = require('../controllers/bills.controller')

// billing form
router.get('/', billForm)

router.get('/user_bill', getBillApi);
router.post('/new_bill', createBill);

module.exports = router