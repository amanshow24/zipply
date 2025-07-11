const axios = require("axios");

const { v4: uuidv4 } = require("uuid");
const User = require("../models/user");
const { setUser } = require("../service/auth");

async function handleUserSignup(req, res) {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.render("signup", {
        error: "Email already registered. Try logging in.",
        user: null,
      });
    }

    await User.create({ name, email, password });
    return res.redirect("/login");
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).render("signup", {
      error: "Something went wrong. Please try again.",
      user: null,
    });
  }
}

async function handleUserLogin(req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // If user doesn't exist or password doesn't match
    if (!user || user.password !== password) {
      return res.render("login", {
        error: "Invalid Email or Password",
        user: null,
      });
    }

    const token = setUser(user);
    res.cookie("token", token);
    return res.redirect("/");
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render("login", {
      error: "Something went wrong. Please try again.",
      user: null,
    });
  }
}


module.exports = {
  handleUserSignup,
  handleUserLogin,
};
