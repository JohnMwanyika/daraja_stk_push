const whatsAppClient = require('@green-api/whatsapp-api-client');
require('dotenv').config();

const restAPI = whatsAppClient.restAPI(({
    // idInstance: process.env.ID_INSTANCE,
    idInstance: "1101802143",
    apiTokenInstance: "42d22aa6eadf4ee9aff6024b0dbb2371a4cc4a7adb6f43e3a3"
    // apiTokenInstance: process.env.API_TOKEN_INSTANCE
}))

restAPI.message.sendMessage("254715220671@c.us", null, "hello Francis comming from API")
.then((data) => {
    console.log(data);
}) ;
