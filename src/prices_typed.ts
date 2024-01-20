import "./polyfills";
import express from "express";
import { Database } from "./database";
import { Temporal } from "@js-temporal/polyfill";

// Refactor the following code to get rid of the legacy Date class.
// Use Temporal.PlainDate instead. See /test/date_conversion.spec.mjs for examples.

function createApp(database: Database) {
  const app = express();

  app.put("/prices", (req, res) => {
    const type = req.query.type as string;
    const cost = parseInt(req.query.cost as string);
    database.setBasePrice(type, cost);
    res.json();
  });

  app.get("/prices", (req, res) => {
    const age = req.query.age ? parseInt(req.query.age as string) : undefined;
    const type = req.query.type as string;
    const baseCost = database.findBasePriceByType(type)!.cost;
    const date = parseDate(req.query.date as string);
    const cost = calculateCost(age, type, date, baseCost);
    res.json({ cost });
  });

  function parseDate(dateString: string | undefined): Date | undefined {
    if (dateString) {
      return new Date(Temporal.PlainDate.from(dateString).toString());
    }
  }

  function calculateCost(age: number | undefined, type: string, date: Date | undefined | Temporal.PlainDate, baseCost: number) {
    if (type === "night") {
      return calculateCostForNightTicket(age, baseCost);
    } else {
      return calculateCostForDayTicket(age, date, baseCost);
    }
  }

  function calculateCostForNightTicket(age: number | undefined, baseCost: number) {
    if (age === undefined) {
      return 0;
    }
    if (age < 6) {
      return 0;
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.4);
    }
    return baseCost;
  }

  function calculateCostForDayTicket(age: number | undefined, date: Date | undefined | Temporal.PlainDate, baseCost: number) {
    let reduction = calculateReduction(date);
    if (age === undefined) {
      return Math.ceil(baseCost * (1 - reduction / 100));
    }
    if (age < 6) {
      return 0;
    }
    if (age < 15) {
      return Math.ceil(baseCost * 0.7);
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.75 * (1 - reduction / 100));
    }
    return Math.ceil(baseCost * (1 - reduction / 100));
  }

  function calculateReduction(date: Date | undefined | Temporal.PlainDate) {
    let reduction = 0;
    if (date && isMonday(date) && !isHoliday(date)) {
      reduction = 35;
    }
    return reduction;
  }

  function isMonday(date: Date | Temporal.PlainDate) {
    if (date instanceof Date) return date.getDay() === 1;
    if (date instanceof Temporal.PlainDate) return date.dayOfWeek === 1
  }

  function isHoliday(date: Date | undefined | Temporal.PlainDate) {
    const holidays = database.getHolidays();
    for (let row of holidays) {
      const defined = date && date instanceof Date
      const isTemporalDate = date && date instanceof Temporal.PlainDate
      const holiday2 = Temporal.PlainDate.from(row.holiday)
      const temporalDate = defined && Temporal.PlainDate.from(date.toISOString().replace('Z', ''))
      const cond1 = !!temporalDate && temporalDate.year === holiday2.year
      const cond2 = !!temporalDate && temporalDate.month === holiday2.month
      const cond3 = !!temporalDate && temporalDate.day === holiday2.day
      if (
        defined &&
        cond1 &&
        cond2 &&
        cond3
      ) {
        return true;
      }
    }
    return false;
  }

  return app;
}

export { createApp };
