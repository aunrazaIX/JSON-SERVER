const mongoose = require("mongoose");
require("dotenv").config();
const Joi = require("joi");
const mongoosePaginate = require('mongoose-paginate-v2');

const blogsSchema = new mongoose.Schema(
    {

        image: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
    },
    { timestamps: true }
);
const validateBlogsSchema = (blog) => {
    const schema = Joi.object({
        image: Joi.string().required(),
        title: Joi.string().required(),
        content: Joi.string().required(),

    });
    return schema.validate(blog);
};
blogsSchema.plugin(mongoosePaginate)
const Blogs = mongoose.model("Blogs", blogsSchema);
module.exports = {
    validateBlogsSchema,
    Blogs,
};