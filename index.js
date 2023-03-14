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

app.get('/token', (req,res)=>{
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

