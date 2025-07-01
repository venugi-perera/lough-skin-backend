import Blog from '../Models/Blog.js'; // import the model

// Create blog
const generateBlog = async (req, res) => {
  try {
    const {
      title,
      body,
      author,
      status,
      category,
      readingTime,
      createdDate,
      createdTime,
      imageUrl, // added imageUrl
    } = req.body;

    if (
      !title ||
      !body ||
      !author ||
      !category ||
      !readingTime ||
      !createdDate ||
      !createdTime ||
      !imageUrl
    ) {
      return res.status(400).json({
        message:
          'Missing required fields: title, body, author, category, readingTime, createdDate, createdTime, or imageUrl',
      });
    }

    const blog = await Blog.create({
      title,
      body,
      author,
      status,
      category,
      readingTime,
      createdDate,
      createdTime,
      imageUrl,
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

// Edit/Update a blog
const editBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      body,
      author,
      status,
      category,
      readingTime,
      createdDate,
      createdTime,
      imageUrl, // added imageUrl
    } = req.body;

    if (
      !title ||
      !body ||
      !author ||
      !category ||
      !readingTime ||
      !createdDate ||
      !createdTime ||
      !imageUrl
    ) {
      return res.status(400).json({
        message:
          'Missing required fields: title, body, author, category, readingTime, createdDate, createdTime, or imageUrl',
      });
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      {
        title,
        body,
        author,
        status,
        category,
        readingTime,
        createdDate,
        createdTime,
        imageUrl,
      },
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.status(200).json({ blog: updatedBlog });
  } catch (error) {
    console.error('Error updating blog:', error);
    res
      .status(500)
      .json({ message: 'Error updating blog', error: error.message });
  }
};

// Delete a blog
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBlog = await Blog.findByIdAndDelete(id);

    if (!deletedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res
      .status(500)
      .json({ message: 'Error deleting blog', error: error.message });
  }
};

export default {
  generateBlog,
  getAllBlogs,
  editBlog,
  deleteBlog,
};
