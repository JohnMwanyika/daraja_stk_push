require('dotenv').config();
const moment = require('moment');
const axios = require('axios');

const cs = process.env.MPESA_CONSUMER_SECRET;
const ck = process.env.MPESA_CONSUMER_KEY;
const sc = process.env.MPESA_SHORT_CODE;
const pk = process.env.MPESA_PASS_KEY;
const cb = process.env.CALL_BACK_URL;


async function getAccessToken(secret, key) {
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    let auth = Buffer.from(`${key}:${secret}`).toString('base64');

    const headers = {
        Authorization: `Basic ${auth}`
    }
    try {
        const response = await axios.get(url, { headers });
        return response.data.access_token;
    } catch (error) {
        return { status: 'error', data: `An error occured while getting access token: ${error.message}` }
    }
};

// getAccessToken(cs, ck)
//     .then(data => { return data.data.access_token })
//     .catch(error => { return { status: 'error', data: `An error occured while getting access token: ${error.message}` } })

async function stkPush(shortcode, passkey, access_token, callBackUrl, phone, amount, accountNo, description) {
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    const data = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // you can also use "CustomerBuyGoodsOnline" or "CustomerPayBillOnline"
        Amount: amount,
        PartyA: phone, // initiator phone number
        PartyB: shortcode, //paybill number
        PhoneNumber: phone, // initiator phone number
        CallBackURL: callBackUrl,
        AccountReference: accountNo, // Account number used when paying can also be a name or anything else
        TransactionDesc: description || "" //description which is optional
    };
    const headers = { Authorization: `Bearer ${access_token}` };
    try {
        const response = await axios.post(url, data, { headers });
        console.log(response);
        return response.data
    } catch (error) {
        if (error.response && error.response.data) {
            const responseData = error.response.data;
            // Now you can access and handle the data in the error response
            return { status: 'error', data: `Error: ${responseData.errorMessage}` };
        } else {
            // Handle the error without response data (e.g., network error)
            return { status: 'error', data: `A network error occured while initiating payment request:- ${error.message}` };
        }
    }
};
// usage
// stkPush().then(data => console.log(data)).catch(error => console.log(error))

async function registerUrl(access_token, shortCode, confirmation_url, validation_url) {
    const url = 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl';
    const headers = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };

    const data = {
        ShortCode: shortCode,
        ResponseType: "Completed",
        ConfirmationURL: confirmation_url,
        ValidationURL: validation_url
    };
    // JSON.stringify(data);
    try {
        const response = await axios.post(url, data, { headers });
        console.log(response);
        return response.data
    } catch (error) {
        if (error.response && error.response.data) {
            const responseData = error.response.data;
            // Now you can access and handle the data in the error response
            return { status: 'error', data: `Error: ${responseData.errorMessage}` };
        } else {
            // Handle the error without response data (e.g., network error)
            return { status: 'error', data: `A network error occured while initiating payment request:- ${error.message}` };
        }
    };

};

async function simulateTransaction(access_token, shortCode, amount, billReff) {
    const url = 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate';
    const headers = { Authorization: `Bearer ${access_token}` };
    let data = {
        ShortCode: shortCode,
        CommandID: "CustomerPayBillOnline",
        Amount: amount,
        Msisdn: "254708374149",
        BillRefNumber: billReff
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log(response);
        return response.data
    } catch (error) {
        if (error.response && error.response.data) {
            const responseData = error.response.data;
            // Now you can access and handle the data in the error response
            return { status: 'error', data: `Error: ${responseData.errorMessage}` };
        } else {
            // Handle the error without response data (e.g., network error)
            return { status: 'error', data: `A network error occured while initiating payment request:- ${error.message}` };
        }
    };
};


module.exports = { stkPush, registerUrl, simulateTransaction };


const makeStkPush = async () => {
    try {
        const access_token = await getAccessToken(process.env.MPESA_CONSUMER_SECRET, process.env.MPESA_CONSUMER_KEY);
        const response = await stkPush(sc, pk, access_token, cb, 254726330706, 1, 'Test', 'Testing my app money will be refunded')
        console.log('This is Access_Token ###', access_token)
        console.log('This is response ***', response)
    } catch (error) {
        console.log(error.message);
    }
};

// makeStkPush();