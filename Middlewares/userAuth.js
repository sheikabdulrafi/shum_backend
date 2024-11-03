import jwt from "jsonwebtoken";
import dotenv from "dotenv";



dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to set a JWT cookie after successful authentication
export const setJwtCookie = (req, res, next) => {
  const { userId } = req; // Assuming userId is set in the request by the register/login function

  // Generate a JWT
  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "1h" }); // Token expires in 1 hour

  // Set cookie options
  const cookieOptions = {
    httpOnly: true,         // Prevents JavaScript from accessing the cookie
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    maxAge: 3600000,        // 1 hour
    sameSite: "strict",     // Helps prevent CSRF attacks
  };

  // Set the JWT as a cookie
  res.cookie("token", token, cookieOptions);

  next(); // Proceed to the next middleware or route handler
};

// Middleware to verify JWT in cookies
export const isAuth = (req, res, next) => {
  const token = req.cookies.token; // Read token from cookies

  // If no token, respond with an unauthorized status
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    
    req.userId = decoded.id; // Attach the decoded user ID to the request for further use
    next(); // Proceed to the next middleware or route handler
  });
};
