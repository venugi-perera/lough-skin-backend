import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  author: { type: String, required: true },
  status: { type: String, default: 'draft' },
  category: { type: String, required: true }, // Added category
  readingTime: { type: String, required: true }, // Added reading time
  createdDate: { type: String, required: true },
  createdTime: { type: String, required: true },
  imageUrl: { type: String, required: true }, // Added image URL
});

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
