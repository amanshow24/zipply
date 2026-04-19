const { addMonthsToIST, getISTDateString } = require("./istTime");

const PLAN_LIMITS = {
  NORMAL: { shortUrls: 3, qrCodes: 2 },
  PRO: { shortUrls: 10, qrCodes: 10 },
  PLUS: { shortUrls: 25, qrCodes: 25 },
};

const PLAN_LABELS = {
  NORMAL: "Free",
  PRO: "Pro",
  PLUS: "Plus",
};

function normalizePlan(plan) {
  const upperPlan = String(plan || "NORMAL").toUpperCase();
  return PLAN_LIMITS[upperPlan] ? upperPlan : "NORMAL";
}

function getPlanLimits(plan) {
  return PLAN_LIMITS[normalizePlan(plan)];
}

function getPlanLabel(plan) {
  return PLAN_LABELS[normalizePlan(plan)] || PLAN_LABELS.NORMAL;
}

function isPlanExpired(subscription = {}) {
  const plan = normalizePlan(subscription.plan);

  if (plan === "NORMAL") {
    return false;
  }

  if (!subscription.expiresAt) {
    return true;
  }

  return new Date(subscription.expiresAt).getTime() <= Date.now();
}

function getEffectivePlan(user) {
  const subscription = user?.subscription || {};
  const plan = normalizePlan(subscription.plan);

  if (plan === "NORMAL") {
    return "NORMAL";
  }

  return isPlanExpired(subscription) ? "NORMAL" : plan;
}

function getUsageForToday(subscription = {}) {
  const todayIST = getISTDateString();
  const usage = subscription.usage || {};

  if (usage.dateIST !== todayIST) {
    return {
      dateIST: todayIST,
      shortUrlCount: 0,
      qrCount: 0,
      reset: true,
    };
  }

  return {
    dateIST: usage.dateIST || todayIST,
    shortUrlCount: Number(usage.shortUrlCount || 0),
    qrCount: Number(usage.qrCount || 0),
    reset: false,
  };
}

function getUsageSnapshot(user, kind) {
  const plan = getEffectivePlan(user);
  const limits = getPlanLimits(plan);
  const usage = getUsageForToday(user?.subscription);
  const isQr = kind === "qr";
  const key = isQr ? "qrCount" : "shortUrlCount";
  const current = usage[key];
  const limit = isQr ? limits.qrCodes : limits.shortUrls;

  return {
    plan,
    limits,
    usage,
    current,
    limit,
    allowed: current < limit,
  };
}

function getExpiredSubscriptionPatch(subscription = {}) {
  const plan = normalizePlan(subscription.plan);

  if (plan === "NORMAL") {
    return null;
  }

  if (!isPlanExpired(subscription)) {
    return null;
  }

  return {
    "subscription.plan": "NORMAL",
    "subscription.status": "EXPIRED",
  };
}

function getSubscriptionExpiryFromNow(months = 1) {
  return addMonthsToIST(new Date(), months);
}

module.exports = {
  PLAN_LIMITS,
  PLAN_LABELS,
  normalizePlan,
  getPlanLimits,
  getPlanLabel,
  getEffectivePlan,
  getUsageForToday,
  getUsageSnapshot,
  getExpiredSubscriptionPatch,
  getSubscriptionExpiryFromNow,
};