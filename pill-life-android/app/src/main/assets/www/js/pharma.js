/**
 * Pill-Life — Pharmacokinetic Engine
 * Single-compartment oral absorption model with superposition
 */

/**
 * Calculate blood level at a given time after a single dose.
 * Uses the Bateman equation (one-compartment, first-order absorption).
 *
 * C(t) = (F * D * ka) / (Vd * (ka - ke)) * (e^(-ke*t) - e^(-ka*t))
 *
 * We normalize (F * D / Vd = doseMg) so output is in "relative units".
 *
 * @param {number} doseMg           — dose amount in mg
 * @param {number} tHours           — time since dosing in hours
 * @param {number} absorptionHours  — time to peak absorption (~Tmax proxy)
 * @param {number} halfLifeHours    — elimination half-life
 * @returns {number} normalized blood level
 */
export function calculateBloodLevel(doseMg, tHours, absorptionHours, halfLifeHours) {
  if (tHours <= 0) return 0;

  // Elimination rate constant
  const ke = Math.LN2 / halfLifeHours;

  // Absorption rate constant — derived so that Tmax ≈ absorptionHours
  // Tmax = ln(ka/ke) / (ka - ke).  We use a practical heuristic:
  // ka ≈ 2–5× ke typically; we set ka so peak is near absorptionHours.
  // For a clean approach: ka = ln(ka/ke)/(Tmax*(ka-ke)) is implicit,
  // but a good approximation is ka ≈ 3.0 / absorptionHours (works well for typical drugs).
  const ka = Math.max(ke * 1.1, 3.0 / absorptionHours);

  const diff = ka - ke;
  if (Math.abs(diff) < 1e-10) {
    // Edge case: ka ≈ ke  →  C(t) = D * ka * t * e^(-ke*t)
    return doseMg * ka * tHours * Math.exp(-ke * tHours);
  }

  const level = (doseMg * ka / diff) * (Math.exp(-ke * tHours) - Math.exp(-ka * tHours));
  return Math.max(0, level);
}

/**
 * Calculate the time (in hours) from dosing to peak blood level (Tmax).
 * Tmax = ln(ka / ke) / (ka - ke)
 *
 * @param {number} absorptionHours — time to peak absorption
 * @param {number} halfLifeHours   — elimination half-life
 * @returns {number} hours until peak
 */
export function calculatePeakTime(absorptionHours, halfLifeHours) {
  const ke = Math.LN2 / halfLifeHours;
  const ka = Math.max(ke * 1.1, 3.0 / absorptionHours);

  const diff = ka - ke;
  if (Math.abs(diff) < 1e-10) {
    // Edge case: ka ≈ ke  →  Tmax = 1/ke
    return 1 / ke;
  }

  return Math.log(ka / ke) / diff;
}

/**
 * Calculate a drug's blood-level timeline across a time range,
 * using superposition of all doses.
 *
 * @param {object}   drug        — drug object from store
 * @param {object[]} doses       — array of dose objects for this drug
 * @param {Date}     startTime   — timeline start
 * @param {Date}     endTime     — timeline end
 * @param {number}   stepMinutes — resolution (default 15 min)
 * @returns {{ time: Date, level: number }[]}
 */
export function calculateDrugTimeline(drug, doses, startTime, endTime, stepMinutes = 15) {
  const points = [];
  const stepMs = stepMinutes * 60 * 1000;
  const start = startTime.getTime();
  const end = endTime.getTime();

  // Create local copies of doses and project future ones if schedule is active
  const allDoses = [...doses];
  if (drug.scheduleHours > 0 && drug.showFutureDoses && doses.length > 0) {
    const sorted = [...doses].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());
    const latestDose = sorted[sorted.length - 1];
    const latestTime = new Date(latestDose.takenAt).getTime();
    
    let projectTime = latestTime + drug.scheduleHours * 3600 * 1000;
    let projId = 1;
    while (projectTime <= end) {
      allDoses.push({
        id: `projected-${drug.id}-${projId++}`,
        drugId: drug.id,
        doseMg: drug.doseMg,
        takenAt: new Date(projectTime).toISOString()
      });
      projectTime += drug.scheduleHours * 3600 * 1000;
    }
  }

  for (let t = start; t <= end; t += stepMs) {
    const currentTime = new Date(t);
    let totalLevel = 0;

    for (const dose of allDoses) {
      const takenAt = new Date(dose.takenAt).getTime();
      const hoursElapsed = (t - takenAt) / (3600 * 1000);
      if (hoursElapsed > 0) {
        totalLevel += calculateBloodLevel(
          dose.doseMg,
          hoursElapsed,
          drug.absorptionHours,
          drug.halfLifeHours
        );
      }
    }

    points.push({ time: currentTime, level: totalLevel });
  }

  return points;
}

/**
 * Calculate timelines for ALL drugs, ready for Chart.js datasets.
 * Timeline is shifted: 25% past, 75% future (e.g. -6 to +18 for 24h).
 *
 * @param {object[]} drugs      — all drugs from store
 * @param {object[]} allDoses   — all doses from store
 * @param {number}   hoursRange — how many hours to show (default 24)
 * @returns {{ datasets: object[], startTime: Date, endTime: Date, pastHours: number, futureHours: number }}
 */
export function calculateAllDrugsTimeline(drugs, allDoses, hoursRange = 24) {
  const now = new Date();
  const pastHours = hoursRange * 0.25;
  const futureHours = hoursRange * 0.75;
  const startTime = new Date(now.getTime() - pastHours * 3600 * 1000);
  const endTime = new Date(now.getTime() + futureHours * 3600 * 1000);

  const datasets = [];

  for (const drug of drugs) {
    const drugDoses = allDoses.filter(d => d.drugId === drug.id);
    if (drugDoses.length === 0) continue;

    // Include doses from before the visible window that may still contribute
    const relevantDoses = drugDoses.filter(d => {
      const takenAt = new Date(d.takenAt).getTime();
      // A dose could still be active if taken within 10 half-lives before endTime
      const maxActiveHours = drug.halfLifeHours * 10;
      return takenAt < endTime.getTime() &&
             (endTime.getTime() - takenAt) / 3600000 < maxActiveHours;
    });

    if (relevantDoses.length === 0) continue;

    const timeline = calculateDrugTimeline(drug, relevantDoses, startTime, endTime, 10);

    datasets.push({
      label: drug.name,
      data: timeline.map(p => ({
        x: (p.time.getTime() - now.getTime()) / 3600000, // hours relative to now
        y: p.level,
      })),
      borderColor: drug.color,
      backgroundColor: (context) => {
        const chart = context.chart;
        const {ctx, chartArea} = chart;
        if (!chartArea) return drug.color + '20';
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, drug.color + '00');
        gradient.addColorStop(1, drug.color + '60');
        return gradient;
      },
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 0,
      pointHitRadius: 8,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: drug.color,
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 2,
      segment: {
        borderDash: ctx => ctx.p0.parsed.x >= 0 ? [6, 4] : undefined,
      },
    });
  }

  return { datasets, startTime, endTime, pastHours, futureHours };
}
