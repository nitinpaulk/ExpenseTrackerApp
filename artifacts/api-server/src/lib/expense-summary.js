export function calculateAverageDailyThisMonth(totalThisMonth, currentDate) {
  const dayOfMonth = currentDate.getDate();
  return dayOfMonth > 0 ? totalThisMonth / dayOfMonth : 0;
}
