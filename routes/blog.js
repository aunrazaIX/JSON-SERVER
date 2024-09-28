const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
} = require("../controllers/blogs");
const router = express.Router();
router.post("/create", authMiddleware, createBlog);
router.get("/get", getAllBlogs);
router.get("/get/:id", getBlogById);
router.put("/update/:id", authMiddleware, updateBlog);
router.delete("/delete/:id", authMiddleware, deleteBlog);
module.exports = router;
