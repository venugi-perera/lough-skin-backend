// import express from 'express';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import User from '../Models/User.js';

// const router = express.Router();

// // 📌 Signup
// router.post('/signup', async (req, res) => {
//   try {
//     const { name, email, password, imageUrl } = req.body;

//     if (!name || !email || !password) {
//       return res
//         .status(400)
//         .json({ message: 'Please fill all required fields' });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       imageUrl: imageUrl || '', // Optional
//     });

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: '7d',
//     });

//     res.status(201).json({
//       message: 'User registered successfully',
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         imageUrl: user.imageUrl,
//       },
//       token,
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // 📌 Login
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res
//         .status(400)
//         .json({ message: 'Please fill all required fields' });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: '7d',
//     });

//     res.json({
//       message: 'Login successful',
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         imageUrl: user.imageUrl,
//       },
//       token,
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// export default router;
