var express = require("express");
var router = express.Router();
// import authentication middleware
const { authenticateUser } = require('../middlewares/authenticate');
// get access tokem middleware
const { getAccessToken } = require('../middlewares/accessToken');
// use this middleware with all requests
router.use(getAccessToken);
// import all transaction controllers
const { getTransactions, stkPush, processCallback } = require('../controllers/transaction.controller');



// get user transactions
router.get('/user_transactions', authenticateUser,getTransactions);
// stk push
router.post('/stk', authenticateUser, stkPush);
// callback data
router.post('/callback', processCallback);


module.exports = router;