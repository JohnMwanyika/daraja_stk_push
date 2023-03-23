require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const { response } = require('express');
const sendSms = require('../utils/sendSms');


module.exports = {
    stkPush: async (req, res) => {
        // capture the number of client paying and amount to be paid
        const phone = req.body.phone.substring(1); //removes zero on phone number
        const amount = req.body.amount;

        // generating timestamp using js
        const date = new Date();
        const timestamp = date.getFullYear() +
            ("0" + (date.getMonth() + 1)).slice(-2) +
            ("0" + date.getDate()).slice(-2) +
            ("0" + date.getHours()).slice(-2) +
            ("0" + date.getMinutes()).slice(-2) +
            ("0" + date.getSeconds()).slice(-2);

        // getting required details from my api app from safaricom
        const shortcode = process.env.MPESA_SHORT_CODE;
        const passkey = process.env.MPESA_PASSKEY;

        // creating the password by concatinating the three and converting it to base 8
        const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
        // posting our data to safaricom using axios
        await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline", // you can also use "CustomerBuyGoodsOnline"
                Amount: amount,
                PartyA: `254${phone}`, // initiator phone number
                PartyB: shortcode, //paybill number
                PhoneNumber: `254${phone}`, // initiator phone number
                CallBackURL: process.env.CALL_BACK_URL,
                AccountReference: `254${phone}`, // Account number used when paying can also be a name or anything else
                TransactionDesc: "ICT Test" //description which is optional
            },
            {
                headers: {
                    Authorization: `Bearer ${token}` // token generated everytime you send a request to safaricom,, this is comming from the middleware I created above
                }
            }
        ).then((response) => {
            console.log(response.data)
            res.json({ 'response': response.data })
        }).catch((err) => {
            console.log(err.message)
            res.json({ message: { type: 'error', info: err } })
            // res.render('payment', { message: { type: 'error', info: err } })
        })
    },
    // Safaricom's response will be handled here 
    processCallback: async (req, res) => {
        // this shows that safaricom has received our payment request and  processed it and now we are getting a feedback from them
        console.log('Request is being processed...');

        const callback_result = req.body;
        //weather or not the transaction is successful Safaricom will post to the callback route
        // - if transaction is successful the callback will contain the CallbackMetadata and vice-versa
        // so, if it doesnt contain the callbackMetadata we respond to safaricom by telling them we are ok so that it doesnt keep reposting
        if (!callback_result.Body.stkCallback.CallbackMetadata) {
            return res.json('Ok');
        }
        // - else we receive the callbackMetadata and store the information to our db
        console.log(callback_result.Body.stkCallback.CallbackMetadata);

        var correct_phone = callback_result.Body.stkCallback.CallbackMetadata.Item[4].Value;

        if (correct_phone.length > 12) {
            phone = callback_result.Body.stkCallback.CallbackMetadata.Item[3].Value;
        } else {
            phone = callback_result.Body.stkCallback.CallbackMetadata.Item[4].Value;
        }
        // getting the required tdata to store to our db
        var phone = callback_result.Body.stkCallback.CallbackMetadata.Item[4].Value.toString();
        var transcId = callback_result.Body.stkCallback.CallbackMetadata.Item[1].Value;
        var ammount = callback_result.Body.stkCallback.CallbackMetadata.Item[0].Value;

        // if (phone.length > 12){
        //     phone = callback_result.Body.stkCallback.CallbackMetadata.Item[3].Value;
        // }else{
        //     phone = callback_result.Body.stkCallback.CallbackMetadata.Item[4].Value;
        // }

        try {

            const payment = await prisma.payment.create({
                data: {
                    transc_id: transcId,
                    amount: ammount,
                    number: phone
                }
            })
                .then(async (response) => {
                    console.log(response);
                    let paymentId = response.id;
                    let recipient = parseInt(response.number);
                    let amount = parseInt(response.amount);
                    let usernumber = response.number.substring(3);

                    const userpaid = await prisma.user.findUnique({
                        where: {
                            phone: usernumber
                        }
                    })
                    console.log('User paid is ' + userpaid.first_name);
                    // res.json({ userpaid: userpaid.first_name });

                    const updated_transaction = await prisma.payment.update({
                        where: {
                            id: paymentId
                        },
                        data: {
                            userId: userpaid.id
                        }
                    });
                    res.json({ userpaid: userpaid.first_name, updatedTransaction: updated_transaction });
                    // send text to user
                    if (!userpaid) {
                        sendSms(phone, `Hello ${recipient} your payment of Kshs ${amount} has been received for account number ${recipient}`)

                    }
                    sendSms(phone, `Hello ${userpaid.first_name} your payment of Kshs ${amount} has been received for account number ${recipient}`)
                    // res.json({ 'response': response });
                })
        } catch (error) {
            console.log(error.message)
        }
    },
    getTransactions: async (req, res) => {
        try {
            const userId = req.session.user.id;
            console.log(userId);
            user = await prisma.user.findUnique({
                include: { payment: {orderBy: { id: "desc" }} },
                where: {
                    id: req.session.user.id
                },
                // orderBy: { id: "desc" },
            }).then((response) => {
                console.log(response)
                res.json({ transactions: response.payment })
            })
        } catch (error) {
            res.json({ error: error.message })
        }

    }
};