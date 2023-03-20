var express = require("express");
var router = express.Router();
// import authentication middleware
const { authenticateUser } = require('../middlewares/authenticate');
// get access tokem middleware
const { getAccessToken } = require('../middlewares/accessToken');
// import all transaction controllers
const { stkPush, processCallback } = require('../controllers/transaction.controller');

// use this middleware with all requests
router.use(getAccessToken);
// stk push
router.post('/stk', authenticateUser, stkPush);
// callback data
router.post('/callback', processCallback);

module.exports = router;