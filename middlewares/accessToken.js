require('dotenv').config();
const axios = require('axios');

module.exports = {
    getAccessToken: async (req, res, next) => {
        let secret = process.env.MPESA_CONSUMER_SECRET;
        let consumer = process.env.MPESA_CONSUMER_KEY;

        let auth = Buffer.from(`${consumer}:${secret}`).toString('base64');
        // console.log(auth)

        await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: {
                Authorization: `Basic ${auth}`
            }
        }).then((response) => {
            console.log(response.data.access_token);
            token = response.data.access_token
            next();
        }).catch((err) => {
            console.log(err);
            // res.json(err.message);
        })
    }
}