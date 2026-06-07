export function calculateAverageDailyThisMonth(totalThisMonth: number, currentDate: Date): number {
  const dayOfMonth = currentDate.getDate();
  return dayOfMonth > 0 ? totalThisMonth / dayOfMonth : 0;
}

export default calculateAverageDailyThisMonth;
