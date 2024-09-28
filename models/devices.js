const mongoose = require('mongoose')
const devicesSchema = mongoose.Schema({
    fcmToken: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

}, { timestamps: true })

const Devices = mongoose.model('Devices', devicesSchema)
module.exports = {
    Devices
}