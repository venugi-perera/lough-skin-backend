import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  createdDate: { type: String, required: true },
  createdTime: { type: String, required: true },
});

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
