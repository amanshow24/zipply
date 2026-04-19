const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET;

function setUser(user) {
  return jwt.sign({

    _id: user._id ,
    name: user.name,
    email: user.email , 
    role: user.role,
    subscription: user.subscription || undefined,

  } ,SECRET_KEY);
};

function getUser(token) {
  if(!token) return null;

  try {
    return jwt.verify(token,SECRET_KEY);
  } catch (error) {
    return null;
  }
}

module.exports = {
  setUser,
  getUser,
};
