import bcrypt from 'bcryptjs';
import User from '../Models/User.js';

const userSignUp = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if the email is already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already taken.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      userType: 'user', // default user type
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        userType: savedUser.userType,
      },
    });
  } catch (error) {
    console.error(error);
    next(new Error('Unable to create user. Please try later.'));
  }
};

export default userSignUp;
