export const getCurrentFinancialYear = () => {
  const today = new Date();
  let startYear = today.getFullYear();
  if (today.getMonth() < 3) {
    startYear -= 1;
  }
  const endYear = startYear + 1;
  return `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
};

export const getFinancialYearOptions = (start = 2025, end = 2030) => {
  const options = [];
  for (let year = start; year <= end; year++) {
    options.push(`MCPL/${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}/`);
  }
  return options;
};
