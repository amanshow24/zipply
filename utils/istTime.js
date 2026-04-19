const IST_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getEndOfISTDayAsUTC(dateString) {
  return new Date(`${dateString}T23:59:59.999+05:30`);
}

function addMonthsToIST(date = new Date(), months = 1) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

module.exports = {
  IST_TIMEZONE,
  getISTDateString,
  getEndOfISTDayAsUTC,
  addMonthsToIST,
};
