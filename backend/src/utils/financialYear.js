const getCurrentFinancialYear = () => {
  const today = new Date();
  let startYear = today.getFullYear();
  if (today.getMonth() < 3) {
    startYear -= 1;
  }
  const endYear = startYear + 1;
  return `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
};

module.exports = {
  getCurrentFinancialYear
};
