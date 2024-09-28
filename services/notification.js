const notificationService = require("firebase-admin");
var serviceAccount = require("../hotshot-309d4-firebase-adminsdk-j1qv0-a815a78653.json");
notificationService.initializeApp({
    credential: notificationService.credential.cert(serviceAccount)
});
module.exports = {
    notificationService


}