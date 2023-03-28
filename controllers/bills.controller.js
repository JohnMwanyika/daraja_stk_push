const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    billForm: async (req, res) => {
        res.render('billing', { user: req.session.user })
    },
    getBillApi: async (req, res) => {
        // let userId = req.params.id
        // console.log(`Requesting bill for user id ${userId}`)

        const userBill = await prisma.user.findUnique({
            include: { bill: true },
            where: {
                id: req.session.user.id
            }
        })
            .then((data) => {
                console.log('Bill is' + data)
                res.json({ bill: data })
            })
            .catch((err) => {
                console.log(err.message)
                res.json({ error: err.message })
            })
    },
    createBill: async (req, res) => {
        // const userId = req.session.user.id;
        const { userId, amount } = req.body;
        console.log(req.body);
        const userBill = await prisma.user.findUnique({
            include: { bill: true },
            where: {
                id: parseInt(userId)
            }
        })
        console.log(userBill)
        // check if user has bill yet
        if (userBill.bill[0]) {
            // console.log(userBill.bill[0])
            // console.log('this user has been billed earlier')
            const newAmount = userBill.bill[0].amount + parseInt(amount)
            const newBill = await prisma.bill.upsert({
                where: {
                    id: parseInt(userBill.bill[0].id)
                },
                update: {
                    amount: newAmount
                },
                create: {
                    userId: parseInt(userId),
                    amount: parseInt(amount)
                },
            })
                .then((data) => {
                    console.log(data)
                    res.json({ newBill: data, message: { info: 'Bill created/updated Sucessfully', status: 'success' } })
                })
                .catch((error) => {
                    console.log(error.message)
                    res.json({ error: error.message })
                })
        } else {
            console.log('this user has never been billed earlier')
            const newBill = await prisma.bill.create({
                data: {
                    userId: parseInt(userId),
                    amount: parseInt(amount)
                }
            })
            .then((data) => {
                console.log(data)
                res.json({ newBill: data, message: { info: 'Bill created/updated Sucessfully', status: 'success' } })
            })
            .catch((error) => {
                console.log(error.message)
                res.json({ error: error.message })
            })
        }
        // .then(async(data)=>{

        // })
        // const newAmount = userBill.bill[0].amount + parseInt(amount)
        // const newBill = await prisma.bill.upsert({
        //     where: {
        //         id: parseInt(userBill.bill[0].id)
        //     },
        //     update: {
        //         amount: newAmount
        //     },
        //     create: {
        //         userId: parseInt(userId),
        //         amount: parseInt(amount)
        //     },
        // })
        //     .then((data) => {
        //         console.log(data)
        //         res.json({ newBill: data, message: { info: 'Bill created/updated Sucessfully', status: 'success' } })
        //     })
        //     .catch((error) => {
        //         console.log(error.message)
        //         res.json({ error: error.message })
        //     })

    }
}