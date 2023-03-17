require('dotenv').config();
const express = require('express');
const axios = require('axios');
var path = require('path');

const app = express();
const cors = require('cors')
const port = process.env.PORT;
// session should always be a variable for it is reassignable
var session = require('express-session');
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const { PrismaClient } = require("@prisma/client"); //this is where db transaction recording  begins

app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(cors());

// user auth
const {authenticateUser} = require('./middlewares/authenticate');
// app.use(authenticateUser);

// serving static files
app.use(express.static(path.join(__dirname, "public")));
app.use("assets", express.static("/public/assets/"));
// setting view template engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
// initialize and configure session store middleware

app.use(
    session({
        secret: "thisismysecretnooneknowsmysecrethahah",
        saveUninitialized: false,
        store: new PrismaSessionStore(new PrismaClient(), {
            checkPeriod: 2 * 60 * 1000, //ms
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }),
        // cookie: { maxAge: 100000 },
        resave: false,
    })
);

const prisma = new PrismaClient();


app.listen(port, () => {
    console.log(`app listening on localhost: ${port}`);
});

const signinRoute = require('./routes/login.route');
app.use('/',signinRoute)

app.get('/signup', (req, res) => {
    res.render('signup', { title: 'Sign up to Lipa' })
})

app.get('/payment', authenticateUser, (req, res) => {
    console.log(`${req.session.user.first_name} visited the payment page`)
    res.render('payment', { title: "Lipa",user:req.session.user })
})

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

// middleware to geenerate access token on every request
app.use(generateToken);

// Sending the stk push tothe provided credentials on the rquest body
app.post("/stk",authenticateUser, generateToken, async (req, res) => {
    const phone = req.body.phone.substring(1)
    const amount = req.body.amount

    // geerating timestamp using vanilla js
    const date = new Date();
    const timestap =
        date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    const shortcode = process.env.MPESA_SHORT_CODE;
    const passkey = process.env.MPESA_PASSKEY;

    // creating the password by concatenating the three and converting it to base 8
    const password = Buffer.from(shortcode + passkey + timestap).toString('base64')

    // sending a post request to fafaricom with our credentials 
    await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestap,
            TransactionType: "CustomerPayBillOnline", // you can also use "CustomerBuyGoodsOnline"
            Amount: amount,
            PartyA: `254${phone}`, // initiator phone number
            PartyB: shortcode, //paybill number
            PhoneNumber: `254${phone}`, // initiator phone number
            CallBackURL: process.env.CALL_BACK_URL,
            AccountReference: `254${phone}`, // Account number used when paying
            TransactionDesc: "Test" //description which is optional
        },
        {
            headers: {
                Authorization: `Bearer ${token}` // token generated everytime you send a request to safaricom,, this is comming from the middleware I created above
            }
        }
    ).then((response) => {
        console.log(response.data)
        res.json({ 'response': response.data })
        // res.redirect('/payment')
    })
        .catch((err) => {
            console.log(err.message)
            res.json({ message: { type: 'error', info: err } })
            // res.render('payment', { message: { type: 'error', info: err } })
        })


})

// app.get('/online_callback')
// const { PrismaClient } = require("@prisma/client"); //this is where db transaction recording  begins
// const prisma = new PrismaClient();
// import sms utility
const sendSms = require('./utils/sendSms');
// const { signIn } = require('./controllers/login.controller');

app.post('/callback', async (req, res) => {
    const callback_result = req.body;
    console.log(callback_result);
    //weather or not the transaction is successful Safaricom will post to the callback route
    // - if transaction is successful the callback will contain the CallbackMetadata and vice-versa
    // so, if it doesnt contain the callbackMetadata we respond to safaricom by telling them we are ok so that it doesnt keep reposting
    if (!callback_result.Body.stkCallback.CallbackMetadata) {
        return res.json("ok");
    }
    // - else we receive the callbackMetadata and store the information to our db
    console.log(callback_result.Body.stkCallback.CallbackMetadata);

    const phone = callback_result.Body.stkCallback.CallbackMetadata.Item[4].Value
    const transcId = callback_result.Body.stkCallback.CallbackMetadata.Item[1].Value
    const ammount = callback_result.Body.stkCallback.CallbackMetadata.Item[0].Value

    const payment = await prisma.payment.create({
        data: {
            transc_id: transcId,
            amount: ammount,
            number: phone
        }
    })
        .then((response) => {
            console.log(response);
            let recipient = parseInt(response.number);
            let amount = parseInt(response.amount)
            // send text to user
            sendSms(phone, `Hello ${recipient} your payment of ${amount} has been received for account number ${recipient}`)
            // res.json({ 'response': response });
        })
        .catch((err) => {
            console.log(err.message);
        })
});

// // Getting feedback
// app.get('/callback')

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
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        }
    )
        .then((response) => {
            console.log(response.data);
            const data = response.data;
            res.json({ 'response': data });
        })
        .catch((err) => {
            if (err) {
                console.log(err.message)
            }
        })
})

app.post('/confirmation', (req, res) => {
    const results = req.body;
    console.log(results);
})
app.post('/validation', (req, res) => {
    var results = req.body;
    console.log(results);
})