require('dotenv').config();
const express = require('express');
const axios = require('axios')
var path = require('path');

const app = express();
const cors = require('cors')
const port = process.env.PORT

// serving static files
app.use(express.static(path.join(__dirname, "public")));
app.use("assets", express.static("/public/assets/"));
// setting view template engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.listen(port, () => {
    console.log(`app listening on localhost: ${port}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors());

app.get('/', (req, res) => {
    res.render('home', { title: 'Home' })
})

app.get('/payment', (req, res) => {
    res.render('payment', { title: "Lipa" })
})

// app.get('/access_token', (req, res) => {
//     generateToken();
// })

// middleware function to generate token 
const generateToken = async (req, res, next) => {

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

app.use(generateToken);

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
    const shortcode = process.env.MPESA_SHORT_CODE;
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
            AccountReference: `lipa_na_nodejs`, // Account number used when paying
            TransactionDesc: "Test"
        },
        {
            headers: {
                Authorization: `Bearer ${token}` //token generated everytime you send a request to safaricom
            }
        }
    ).then((response) => {
        console.log(response.data)
        // res.status(200).json(response.data)
        res.redirect('/payment')
    })
        .catch((err) => {
            console.log(err.message)
            // res.status(400).json({err.message})
            res.render('payment', { message: { type: 'error', info: err } })
        })


})

// app.get('/online_callback')
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

app.post('/callback', async (req, res) => {
    const callback_result = req.body;
    console.log(callback_result);
    if (!callback_result.Body.stkCallback.CallbackMetadata) {
        return res.json("ok");
    }
    console.log(callback_result.Body.stkCallback.CallbackMetadata);

    const phone = callback_result.Body.stkCallback.CallbackMetadata.Item[3].Value
    const transcId = callback_result.Body.stkCallback.CallbackMetadata.Item[1].Value
    const ammount = callback_result.Body.stkCallback.CallbackMetadata.Item[0].Value

    const datares = await { phone, transcId, ammount }
    console.log(datares)
    const payment = await prisma.payment.create({
        data: {
            transc_id: transcId,
            amount: ammount,
            number: phone
        }
    })
        .then((response) => {
            console.log(response)
        })
});

app.get('/registerurl', (req, res) => {
    // console.log('My token is',token);
    axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl',
        {
            // "ShortCode": "600610",
            ShortCode: process.env.MPESA_SHORT_CODE,
            ResponseType: "Completed",
            ConfirmationURL: "https://lipa.onrender.com/confirmation",
            ValidationURL: "https://lipa.onrender.com/validation"
        },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )
    .then((response) => {
        console.log(response);
        // res.status(200).json({ response });
    })
    .catch((err) => {
        if (err) {
            console.log(err.message)
        }
    })
})

app.post('/confirmation', (req, res) => {
    var results = req.body;
    console.log(results);
})
app.post('/validation', (req, res) => {
    var results = req.body;
    console.log(results);
})