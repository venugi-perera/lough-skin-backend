import Blog from '../Models/Blog.js'; // import the model

// Create blog
const generateBlog = async (req, res) => {
  try {
    const { title, body, createdDate, createdTime } = req.body;

    if (!title || !body || !createdDate || !createdTime) {
      return res.status(400).json({
        message:
          'Missing required fields: title, body, createdDate, or createdTime',
      });
    }

    const blog = await Blog.create({
      title,
      body,
      createdDate,
      createdTime,
    });

    console.log('Blog saved to DB:', blog);
    res.status(201).json({ blog });
  } catch (error) {
    console.error('Error creating blog:', error);
    res
      .status(500)
      .json({ message: 'Error creating blog', error: error.message });
  }
};

// Get all blogs
const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ _id: -1 }); // sort newest first
    res.status(200).json({ blogs });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res
      .status(500)
      .json({ message: 'Error fetching blogs', error: error.message });
  }
};

export default {
  generateBlog,
  getAllBlogs,
};
