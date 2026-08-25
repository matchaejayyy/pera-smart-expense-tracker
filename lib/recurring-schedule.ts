export type RecurringFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

const utcDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day, 12));

const daysInUtcMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();

const addMonths = (value: Date, months: number, scheduleDay: number) => {
  const targetMonth = value.getUTCMonth() + months;
  const firstOfTarget = utcDate(value.getUTCFullYear(), targetMonth, 1);
  const day = Math.min(Math.max(scheduleDay, 1), daysInUtcMonth(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth()));
  return utcDate(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), day);
};

export const dateOnly = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const dateKey = (value: Date | string) => dateOnly(value).toISOString().slice(0, 10);

export function advanceRecurringDate(value: Date, frequency: RecurringFrequency, scheduleDay: number) {
  const current = dateOnly(value);
  if (frequency === "WEEKLY" || frequency === "BIWEEKLY") {
    current.setUTCDate(current.getUTCDate() + (frequency === "WEEKLY" ? 7 : 14));
    return current;
  }
  if (frequency === "MONTHLY") return addMonths(current, 1, scheduleDay);
  if (frequency === "QUARTERLY") return addMonths(current, 3, scheduleDay);
  return addMonths(current, 12, scheduleDay);
}

export function advanceToCurrentOrFuture(value: Date, frequency: RecurringFrequency, scheduleDay: number, today = new Date()) {
  let nextDue = dateOnly(value);
  const currentDay = dateOnly(today);
  while (nextDue.getTime() < currentDay.getTime()) {
    nextDue = advanceRecurringDate(nextDue, frequency, scheduleDay);
  }
  return nextDue;
}
