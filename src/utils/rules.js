import { BOYS, GIRLS } from './chartChild';

export function calcBMI(weightKg, heightCm) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

// 成人：age >= 19
export function classifyAdult(bmi) {
  if (bmi < 16) return 'severeUnder';
  if (bmi < 18.5) return 'under';
  if (bmi < 23) return 'normal';
  if (bmi < 25) return 'over';
  if (bmi < 30) return 'obese';
  return 'severeOver';
}

// 儿童：6 <= age <= 18
export function classifyChild(bmi, age, gender) {
  const row = (gender === 'male' ? BOYS : GIRLS)[Math.min(Math.max(age, 6), 18)];
  const [sUnder, under, normal, over] = row;
  if (bmi <= sUnder) return 'severeUnder';
  if (bmi <= under) return 'under';
  if (bmi <= normal) return 'normal';
  if (bmi <= over) return 'over';
  return 'severeOver';
}

export function classify(bmi, age, gender) {
  return age <= 18 ? classifyChild(bmi, age, gender) : classifyAdult(bmi);
}