var express = require("express");
var router = express.Router();
// import authentication middleware
const {
    authenticateUser
} = require('../middlewares/authenticate');
// get access tokem middleware
const {
    getAccessToken
} = require('../middlewares/accessToken');
// use this middleware with all requests
// router.use(getAccessToken);
// import all transaction controllers
const {
    getTransactions,
    stkPush,
    processCallback,
    registerUrls,
    confirmTransaction,
    validateTransaction,
    simulate
} = require('../controllers/transaction.controller');



// get user transactions
router.get('/user_transactions', authenticateUser, getTransactions);
// stk push
router.post('/stk', getAccessToken, authenticateUser, stkPush);
// callback data
router.post('/callback', processCallback);
// register Urls
router.get('/register', getAccessToken, registerUrls);
// consfirmation request handler
router.post('/confirmation', confirmTransaction);
// validation request handler
router.post('/validation', validateTransaction);

// simulate the c2b transaction
router.get('/simulate', getAccessToken, simulate);


module.exports = router;