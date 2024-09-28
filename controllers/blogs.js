const { messages } = require("../config")
const { Blogs, validateBlogsSchema } = require("../models/blogs");
const { getSearchQuery } = require("../utils");
const { default: mongoose } = require("mongoose")

const createBlog = async (req, res) => {
    try {
        const { body } = req
        const { error } = validateBlogsSchema(body);
        if (error) {
            return res.status(400).send({ message: error?.details[0]?.message });
        }
        let blog = new Blogs(body)
        await blog.save()
        return res.status(200).send({ data: blog });

    }
    catch (e) {
        console.log("Error", e)
        return res.status(500).send({ error: e, message: "Something Went Wrong!" });

    }
}


const getAllBlogs = async (req, res) => {
    try {
        const { query } = req
        const page = parseInt(query.page) || 1;
        const pageSize = parseInt(query.pageSize) || 10;
        const search = query.search;
        let filters = {}
        const options = {
            page,
            sort: { createdAt: -1 },
            limit: pageSize,
        };
        if (search) {
            filters = { ...filters, title: getSearchQuery(search) }
        }
        const blogs = await Blogs.paginate(filters, options);
        return res.status(200).send({ message: messages.success, data: blogs })
    }
    catch (e) {
        return res.status(500).send({ error: e?.message, message: "Something Went Wrong!" });

    }
}
const getBlogById = async (req, res) => {
    try {
        const { params } = req
        let blog = await Blogs.findById(params.id)
        if (!blog) {
            return res.status(400).send({ message: messages.notExist, })
        }
        return res.status(200).send({ message: messages.success, data: blog })
    }
    catch (e) {
        console.log("Error", e)
        return res.status(500).send({ error: e, message: "Something Went Wrong!" });
    }
}
const updateBlog = (async (req, res) => {
    try {
        let { params, body } = req
        if (!mongoose.Types.ObjectId.isValid(params.id)) {
            throw new Error(messages.invalidId)
        }
        let blgs = await Blogs.findByIdAndUpdate(params.id, body, { new: true }).lean()
        return res.status(200).send({
            success: true,
            message: messages.success,
            data: blgs
        })
    } catch (e) {
        console.log("Error Message :: ", e)
        return res.status(400).send({
            success: false,
            message: e.message
        })
    }

})

const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params
        await Blogs.findByIdAndDelete(id)
        return res.status(200).send({
            success: true,
            message: messages.success
        })
    }
    catch (e) {
        return res.status(400).send({
            success: false,
            message: e.message
        })
    }
}
module.exports = {
    createBlog,
    getBlogById,
    getAllBlogs,
    updateBlog,
    deleteBlog
}