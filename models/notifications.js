const mongoose = require('mongoose')
const { notificationStatus }
    = require("../config");
const mongoosePaginate = require('mongoose-paginate-v2');

const notificationSchema = mongoose.Schema({
    notification: {
        body: {
            type: String
        },
        title: {
            type: String
        }
    },
    type: {
        type: String
    },
    metaData: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
        },
    },
    status: {
        type: String,
        enum: notificationStatus,
        default: notificationStatus[1]
    },
    userIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User'
    },
}, { timestamps: true })

notificationSchema.plugin(mongoosePaginate)
const Notifications = mongoose.model('Notifications', notificationSchema)
module.exports = {
    Notifications
}