const whatsAppClient = require('@green-api/whatsapp-api-client');
require('dotenv').config();


module.exports = {
    whatsappText: (phone, message) => {
        const restAPI = whatsAppClient.restAPI(({
            idInstance: process.env.ID_INSTANCE,
            apiTokenInstance: process.env.API_TOKEN_INSTANCE
        }))
        restAPI.message.sendMessage(`254${phone}@c.us`, null,message)
            .then((data) => {
                console.log(data);
            });

    }
}

// restAPI.message.sendMessage("254715220671@c.us", null, "hello Francis comming from API")
//     .then((data) => {
//         console.log(data);
//     });
