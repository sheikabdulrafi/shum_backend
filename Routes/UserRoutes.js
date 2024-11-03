import express from "express";
import {
  getUserData,
  login,
  logout,
  register,
  welcome,
} from "../Controller/UserController.js";
import { isAuth } from "../Middlewares/userAuth.js";

const Router = express.Router();

// Define route with the `welcome` handler
Router.get("/", welcome);
Router.post("/register", register);
Router.post("/login", login);
Router.post("/logout", logout); // Route for logout
Router.get("/getUserData", getUserData);

Router.post("/isAuth", isAuth, (req, res) => {
  res.json({ isVerified: true }); // User is authenticated
});

export default Router;
