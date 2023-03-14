require('dotenv').config();
const express = require('express');
const axios = require('axios')

const app = express();
const cors = require('cors')
const port = process.env.PORT

app.listen(port, () => {
    console.log(`app listening on localhost: ${port}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors());

app.get('/', (req, res) => {
    res.send('ello mundo')
})

app.get('/access_token', (req,res)=>{
    generateToken();
})

// middleware function to generate token 
const generateToken = async (req, res, next) => {

    let secret = process.env.MPESA_CONSUMER_SECRET;
    let consumer = process.env.MPESA_CONSUMER_KEY;

    let auth = Buffer.from(`${consumer}:${secret}`).toString('base64');
    console.log(auth)
    let decauth = Buffer.from(auth,'base64').toString('ascii');
    console.log(decauth)


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

app.post("/stk", generateToken, async (req, res) => {
    const phone = req.body.phone.substring(1)
    const amount = req.body.amount

    const date = new Date();
    const timestap =
        date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    // const shortcode = process.env.MPESA_SHORTCODE;
    const shortcode = 174379;
    const passkey = process.env.MPESA_PASSKEY;

    const password = Buffer.from(shortcode + passkey + timestap).toString('base64')

    await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
            // "BusinessShortCode": "174379",
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestap,
            TransactionType: "CustomerPayBillOnline", // "CustomerBuyGoodsOnline"
            Amount: amount,
            PartyA: `254${phone}`,
            PartyB: shortcode,
            PhoneNumber: `254${phone}`,
            CallBackURL: "https://lipa.onrender.com/callback",
            AccountReference: `254${phone}`, // Account number used when paying
            TransactionDesc: "Test"
        },
        {
            headers: {
                Authorization: `Bearer ${token}` //token generated everytime you send a request to safaricom
            }
        }
    ).then((response) => {
        console.log(response.data)
        res.status(200).json(response.data)
    })
    .catch((err) => {
        console.log(err.message)
        res.status(400).json(err.message)
    })


})


app.post('/callback',(req,res)=>{
    const callback_result = req.body;
    console.log(callback_result);
    if(!callback_result.Body.stkCallback.CallbackMetadata){
       return res.json("ok");
    }
    console.log(!callback_result.Body.stkCallback.CallbackMetadata);
})