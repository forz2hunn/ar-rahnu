export type GoldPriceSnapshot = {
  date: string;
  capturedAt: string;
  price: number;
};

export type GoldForecastPoint = {
  date: string;
  actual: number | null;
  predicted: number | null;
};

export function getMalaysiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateToDayNumber(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function formatSnapshotDate(date: string) {
  return new Intl.DateTimeFormat('ms-MY', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kuala_Lumpur'
  }).format(new Date(`${date}T12:00:00+08:00`));
}

export function buildGoldForecast(history: GoldPriceSnapshot[], minimumSamples = 7): GoldForecastPoint[] {
  const validSnapshots = history
    .filter(snapshot =>
      /^\d{4}-\d{2}-\d{2}$/.test(snapshot.date) &&
      Number.isFinite(Number(snapshot.price)) &&
      Number(snapshot.price) > 0
    )
    .sort((left, right) => left.date.localeCompare(right.date))
    .reduce<GoldPriceSnapshot[]>((unique, snapshot) => {
      if (unique.length && unique[unique.length - 1].date === snapshot.date) {
        unique[unique.length - 1] = snapshot;
      } else {
        unique.push(snapshot);
      }
      return unique;
    }, []);

  if (!validSnapshots.length) return [];

  const chartData: GoldForecastPoint[] = validSnapshots.map(snapshot => ({
    date: formatSnapshotDate(snapshot.date),
    actual: Number(snapshot.price),
    predicted: null
  }));

  if (validSnapshots.length < minimumSamples) return chartData;

  const samples = validSnapshots.slice(-30);
  const originDay = dateToDayNumber(samples[0].date);
  const points = samples.map(snapshot => ({
    day: dateToDayNumber(snapshot.date) - originDay,
    price: Number(snapshot.price)
  }));
  const meanDay = points.reduce((sum, point) => sum + point.day, 0) / points.length;
  const meanPrice = points.reduce((sum, point) => sum + point.price, 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point.day - meanDay) ** 2, 0);
  if (denominator === 0) return chartData;

  const slope = points.reduce(
    (sum, point) => sum + (point.day - meanDay) * (point.price - meanPrice),
    0
  ) / denominator;
  const intercept = meanPrice - slope * meanDay;
  const latest = validSnapshots[validSnapshots.length - 1];
  const latestDay = dateToDayNumber(latest.date) - originDay;
  chartData[chartData.length - 1].predicted = Number(latest.price);

  for (let week = 1; week <= 12; week += 1) {
    const forecastDay = latestDay + week * 7;
    const forecastDate = new Date(dateToDayNumber(latest.date) * 86400000 + week * 7 * 86400000);
    chartData.push({
      date: formatSnapshotDate(getMalaysiaDateKey(forecastDate)),
      actual: null,
      predicted: Number(Math.max(0, intercept + slope * forecastDay).toFixed(2))
    });
  }

  return chartData;
}
