const { getUser } = require("../service/auth");
const User = require("../models/user");
const { getExpiredSubscriptionPatch } = require("../utils/subscription");

async function checkForAuthentication(req , res, next ){
  const tokenCookie = req.cookies?.token;
  req.user = null;

  if(!tokenCookie)      return next();

 const token = tokenCookie;

 const tokenUser = getUser(token);

 if (tokenUser && tokenUser._id) {
  try {
    const dbUser = await User.findById(tokenUser._id).select("name email role subscription").lean();
    if (dbUser) {
      const currentSubscription = dbUser.subscription || tokenUser.subscription || {};
      const expiredPatch = getExpiredSubscriptionPatch(currentSubscription);

      if (expiredPatch) {
        await User.updateOne({ _id: tokenUser._id }, { $set: expiredPatch });
        currentSubscription.plan = "NORMAL";
        currentSubscription.status = "EXPIRED";
      }

      req.user = {
        _id: tokenUser._id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        subscription: currentSubscription,
      };
      return next();
    }
  } catch (error) {
    // Fallback to token payload only if DB read fails.
  }
 }

 req.user = tokenUser;
 if (!req.user.subscription) {
  req.user.subscription = {};
 }
 return next();

}

function restrictTo(roles = []){
return function (req, res , next){
  if(!req.user) return res.redirect("/login");

  if(!roles.includes(req.user.role)) return  res.end("Un-Authorized");

  return next();
}
}

module.exports = {
  checkForAuthentication,
  restrictTo,
};
