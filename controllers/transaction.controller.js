require('dotenv').config();
const {
    PrismaClient
} = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
// const { response } = require('express');
const sendSms = require('../utils/sendSms');
const moment = require('moment');
const { registerUrl, simulateTransaction } = require('../utils/myMpesa');
let production = process.env.MPESA_PRODUCTION;

module.exports = {
    stkPush: async (req, res) => {
        // capture the number of client paying and amount to be paid
        const phone = req.body.phone.substring(1); //removes zero on phone number
        const amount = req.body.amount;
        // const accountNumber = req.body.amount;

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
        console.log("THIS IS THE PASSWORD " + password);
        const url = production ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest" : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

        await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
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
        }, {
            headers: {
                Authorization: `Bearer ${token}` // token generated everytime you send a request to safaricom,, this is comming from the get access token
            }
        }
        ).then((response) => {
            console.log(response.data)
            res.json({
                'response': response.data
            })
        }).catch((err) => {
            console.log(err.message)
            res.json({
                message: {
                    type: 'error',
                    info: err
                }
            })
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
        console.log(callback_result.Body.stkCallback.CallbackMetadata.Item);

        const response = callback_result.Body.stkCallback.CallbackMetadata;
        // initialize an empty result object
        const result = {};
        // iterate through the response Items
        response.Item.forEach(item => {
            // store each item in the result object
            result[item.Name] = item.Value
        });
        console.log('This is what is gonna be saved to db ' + result)
        // assign individual item for clean code and redability
        const phone = result.PhoneNumber.toString();
        const transcId = result.MpesaReceiptNumber;
        const amount = result.Amount;
        const dateString = result.TransactionDate;
        // convert date string to a format that db understands
        const date = moment(dateString, 'YYYYMMDDHHmmss').toDate()

        try {
            // store the transaction in our database
            const payment = await prisma.payment.create({
                data: {
                    transc_id: transcId,
                    amount: amount,
                    number: phone,
                    transaction_date: date
                }
            })
                .then(async (response) => {
                    // get the newly saved transaction's Id
                    let paymentId = response.id;
                    // phone number of the paying client
                    let recipient = parseInt(response.number);
                    // ammount paid
                    let amount = parseInt(response.amount);
                    // removing 254 from client's number
                    let usernumber = response.number.substring(3);
                    // check if client paying is in our database
                    const userPaid = await prisma.user.findUnique({
                        include: {
                            payment: true
                        },
                        where: {
                            phone: `0${usernumber}`
                        }
                    })
                    return {
                        userPaid,
                        paymentId,
                        recipient,
                        amount
                    }
                })
                .then(async (data) => {
                    console.log('User paid is ' + data.userPaid.first_name);
                    // console.log(data)
                    // if the user exists in our database, we update their transaction by appending their Id in the record
                    const updated_transaction = await prisma.payment.update({
                        where: {
                            id: data.paymentId
                        },
                        data: {
                            userId: data.userPaid.id
                        }
                    });

                    const userBill = await prisma.user.findUnique({
                        include: {
                            bill: true
                        },
                        where: {
                            id: data.userPaid.id
                        }
                    })
                    const billedAmount = userBill.bill[0].amount;
                    const paidAmount = updated_transaction.amount;
                    const mpesaRef = updated_transaction.transc_id;
                    // console.log(`${data.userPaid.first_name}'s total bill is ${billedAmount} and paid amount ${paidAmount} total outstanding is ${billedAmount - paidAmount}`)
                    // function to calculate the balance remaining after a payment is made
                    function calculateBalance(bill, payment) {
                        let balance;
                        balance = bill - payment;
                        console.log(`Total bill is ${bill} and paid amount ${payment} total outstanding is ${balance}`)
                        return balance;
                    };
                    const userBalance = calculateBalance(billedAmount, paidAmount);
                    console.log(userBalance);
                    if (userBalance > 0) {
                        const updatedBill = await prisma.bill.update({
                            where: {
                                id: userBill.bill[0].id
                            },
                            data: {
                                amount: userBalance,
                                bill_statusId: 2
                            }
                        })
                    } else if (userBalance == 0) {
                        const updatedBill = await prisma.bill.update({
                            where: {
                                id: userBill.bill[0].id
                            },
                            data: {
                                amount: userBalance,
                                bill_statusId: 4
                            }
                        })
                    } else {
                        const updatedBill = await prisma.bill.update({
                            where: {
                                id: userBill.bill[0].id
                            },
                            data: {
                                amount: userBalance,
                                bill_statusId: 4
                            }
                        })
                        let extra = updatedBill.amount;
                        extra = Math.abs(extra);
                        console.log(`You have paid an extra ${extra},you shudnt pay more next time`);
                        console.log(updatedBill);
                    }
                    // send text to user
                    if (!data.userPaid) {
                        console.log('User paying is not in the system')
                        // if user paying is not in our database we'll respond with their number else well use their first name
                        sendSms(phone, `Hi ${data.userPaid.first_name}, your payment of Kshs ${data.amount} has been received successfully, Mpesa Ref: ${mpesaRef}, Bill Amount: ${billedAmount}, Total paid:${paidAmount}, Amount Due: ${userBalance}`)
                    }
                    // console.log(`Hello ${data.userPaid.first_name} your payment of Kshs ${data.amount} has been received for account number ${data.recipient}`)
                    console.log(`Hi ${data.userPaid.first_name}, your payment of Kshs ${data.amount} has been received successfully, Mpesa Ref: ${mpesaRef}, Bill Amount: ${billedAmount}, Total paid:${paidAmount}, Amount Due: ${userBalance}`);
                    sendSms(phone, `Hi ${data.userPaid.first_name}, your payment of Kshs ${data.amount} has been received successfully, Mpesa Ref: ${mpesaRef}, Bill Amount: ${billedAmount}, Total paid:${paidAmount}, Amount Due: ${userBalance}`);
                    //send whatsapp message
                    // const {whatsappText} = require('../utils/whatsapp')
                    // whatsappText(usernumber,`Hello ${userpaid.first_name} your payment of Kshs ${amount} has been received for account number ${recipient}`);
                })


        } catch (error) {
            console.log(error.message)
        }
    },
    getTransactions: async (req, res) => {
        // try {
        const userId = req.session.user.id;
        console.log(userId);

        const user = await prisma.user.findUnique({
            include: {
                payment: {
                    orderBy: {
                        id: "desc"
                    }
                }
            },
            where: {
                id: req.session.user.id
            },
            // orderBy: { id: "desc" },
        }).then((response) => {
            console.log(response.payment)
            res.json({
                transactions: response.payment
            })
        })
            .catch((err) => {
                console.log(err.message)
                res.json({
                    error: error.message
                })
            })
        // } catch (error) {
        //     res.json({ error: error.message })
        // }
    },
    registerUrls: async (req, res) => {
        const shortCode = process.env.MPESA_SHORT_CODE;
        const confirmUrl = process.env.MPESA_CONFIRM_URL;
        const validateUrl = process.env.MPESA_VALIDATE_URL;

        try {
            const response = await registerUrl(token, shortCode, confirmUrl, validateUrl);
            console.log(response.data);
            res.json({ status: 'success', data: response });
        } catch (error) {
            console.log(error);
            res.json({ status: 'error', data: error });
        }
    },
    confirmTransaction: (req, res) => {
        console.log('-------------------------------- CONFIRMATION -------------------------------------')
        const response = req.body
        console.log(response)
        // res.json({ status: 'success', data: response })
    },
    validateTransaction: (req, res) => {
        console.log('-------------------------------- VALIDATION -------------------------------------')
        const response = req.body
        console.log(response)
        // res.json({ status: 'success', data: response })
    },
    simulate: async (req, res) => {
        const shortCode = process.env.MPESA_SHORT_CODE;

        try {
            const response = await simulateTransaction(token, shortCode, '100', 'TestingMyApi');
            console.log(response);
            res.json({ status: 'success', data: response });
        } catch (error) {
            console.log(error);
            res.json({ status: 'error', data: error });

        }
    }
};