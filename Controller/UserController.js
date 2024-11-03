import { setJwtCookie } from "../Middlewares/userAuth.js";
import User from "../Models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const welcome = (req, res) => {
  res.send("Welcome to the Server");
};

export const register = async (req, res) => {
  const { username, email, password } = req.body;

  // Validate input fields
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if user already exists by email and username
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create a new user instance
    const user = new User({ username, email, password });

    // Hash the password
    user.password = await bcrypt.hash(password, 10);

    // Save the user to the database
    await user.save();

    // Attach the userId to the request to be used in the middleware
    req.userId = user._id;

    // Call the setJwtCookie middleware
    setJwtCookie(req, res, () => {
      // Exclude the password from the response
      res.status(201).json({
        message: "User registered successfully",
        user: { ...user._doc, password: undefined }, // Exclude password
      });
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate key error" });
    }
    res.status(500).json({ message: "Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate input fields
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Attach the userId to the request to be used in the middleware
    req.userId = user._id;

    // Call the setJwtCookie middleware
    setJwtCookie(req, res, () => {
      // Exclude the password from the response
      res.status(200).json({
        message: "User logged in successfully",
        user: { ...user._doc, password: undefined }, // Exclude password
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const logout = (req, res) => {
  // Clear the JWT cookie
  res.cookie("token", "", {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ message: "User logged out successfully" });
};

export const getUserData = async (req, res) => {
  // Get the token from the request (assuming it's in cookies)
  const token = req.cookies.token; // or req.headers.authorization.split(' ')[1] if using Authorization header

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure you have JWT_SECRET in your environment variables

    // Retrieve the user ID from the decoded token
    const userId = decoded.id;

    // Fetch user data from the database
    const user = await User.findById(userId).select("-password"); // Exclude password from the retrieved user data

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the user data in response
    res.status(200).json({
      message: "User data retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
    res.status(500).json({ message: "Server Error" });
  }
};
