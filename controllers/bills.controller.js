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
    },
    createBill: async (req, res) => {
        // const userId = req.session.user.id;
        const { userId, amount } = req.body;

        const newBill = await prisma.bill.upsert({
            where: {
                user_id: parseInt(userId)
            },
            create: {
                user_id: parseInt(userId),
                amount: amount
            },
            update: {
                user_id: parseInt(userId),
                amount: amount
            }
        })
        .then((data)=>{
            console.log(data)
        })

    }
}