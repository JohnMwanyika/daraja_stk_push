require('dotenv').config();
const unirest = require('unirest');
const axios = require('axios');

module.exports = {
    getAccessToken: async (req, res, next) => {
        let secret = process.env.MPESA_CONSUMER_SECRET;
        let consumer = process.env.MPESA_CONSUMER_KEY;

        let auth = Buffer.from(`${consumer}:${secret}`).toString('base64');
        console.log('AUTHENTICATION ' + auth);

        try {
            const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            });
            console.log('ACCESS TOKEN' + response.data);
            token = response.data.access_token
            next();

        } catch (error) {
            console.log(error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to generate access token'
            });
        }

    },
    // getNewAccessToken: (req, res, next) => {
    //     let secret = process.env.MPESA_CONSUMER_SECRET;
    //     let consumer = process.env.MPESA_CONSUMER_KEY;
    //     let auth = Buffer.from(`${consumer}:${secret}`).toString('base64');
    //     console.log('AUTHENTICATION ' + auth);

    //     unirest.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials")
    //         .headers({
    //             'Authorization': `Basic ${auth}`
    //         })
    //         .send()
    //         .end(res => {
    //             if (res.error) {
    //                 console.log(res.error)

    //             } else {
    //                 console.log(res.body)
    //                 token = res.body
    //                 next();
    //             }

    //         })
    // },
    // getAccessToken: (req, res, next) => {
    //     let secret = process.env.MPESA_CONSUMER_SECRET;
    //     let consumer = process.env.MPESA_CONSUMER_KEY;
    //     let auth = Buffer.from(`${consumer}:${secret}`).toString('base64');
    //     console.log('BASIC AUTHENTICATION ' + auth);

    //     let headers = new Headers();
    //     headers.append("Authorization", `Basic ${auth}`);
    //     fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
    //             headers
    //         })
    //         .then(response => response.text())
    //         .then(result => console.log('Results  ' + result))
    //         .catch(error => console.log(error));
    // }
}