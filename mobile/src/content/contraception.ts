import type { Contraception } from '../types';

/**
 * Deliberately free of icon or native imports so the engine can share this
 * list — there must be exactly one answer to "does this suppress ovulation".
 */
export const CONTRACEPTION_OPTIONS: {
  value: Contraception;
  label: string;
  hormonal: boolean;
}[] = [
  { value: 'none', label: 'None', hormonal: false },
  { value: 'combined_pill', label: 'Combined pill', hormonal: true },
  { value: 'progestogen_pill', label: 'Progestogen-only pill', hormonal: true },
  { value: 'hormonal_iud', label: 'Hormonal IUD or coil', hormonal: true },
  { value: 'implant', label: 'Implant', hormonal: true },
  { value: 'injection', label: 'Injection', hormonal: true },
  { value: 'ring', label: 'Vaginal ring', hormonal: true },
  { value: 'patch', label: 'Patch', hormonal: true },
  { value: 'copper_iud', label: 'Copper IUD or coil', hormonal: false },
  { value: 'barrier', label: 'Condoms or diaphragm', hormonal: false },
  { value: 'other', label: 'Something else', hormonal: false },
];

export const CONTRACEPTION_LABELS: Record<Contraception, string> = Object.fromEntries(
  CONTRACEPTION_OPTIONS.map((option) => [option.value, option.label])
) as Record<Contraception, string>;

/**
 * Whether the method suppresses ovulation, which decides if recorded bleeds are
 * real cycles or scheduled withdrawal bleeds.
 *
 * A copper IUD and barrier methods do not interfere with ovulation, so cycle
 * patterns stay meaningful on them. `other` is treated as non-suppressing
 * because we genuinely do not know: a flag that wrongly prompts someone to ask
 * a clinician is a smaller harm than silently hiding a real pattern.
 */
export function suppressesOvulation(contraception: Contraception | null): boolean {
  if (contraception === null) return false;
  return CONTRACEPTION_OPTIONS.find((option) => option.value === contraception)?.hormonal ?? false;
}
