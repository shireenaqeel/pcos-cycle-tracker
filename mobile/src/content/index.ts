import type { EducationContent, Phenotype } from '../types';

import raw from './education.json';

/**
 * The JSON is shipped with the app and only ever edited in this repo, so the
 * single cast here is the boundary where it gains its type.
 */
export const EDUCATION_CONTENT = raw as EducationContent[];

export function contentForPhenotype(phenotype: Phenotype | null): EducationContent[] {
  const audience = phenotype ?? 'unknown';
  return EDUCATION_CONTENT.filter((item) => item.phenotypeRelevance.includes(audience));
}
