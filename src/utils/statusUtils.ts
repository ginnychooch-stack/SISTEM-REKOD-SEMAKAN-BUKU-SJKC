import { SubmissionItem, SubmissionStatus } from '../types';

/**
 * Normalizes a submission item or undefined into a strict SubmissionStatus:
 * - If status is explicitly 'DIHANTAR', 'BELUM_HANTAR', or 'BELUM_DISEMAK', returns it.
 * - Otherwise fallback to submitted boolean: true -> 'DIHANTAR', false -> 'BELUM_DISEMAK'.
 * Default state is always 'BELUM_DISEMAK'.
 */
export function getSubmissionStatus(item?: SubmissionItem): SubmissionStatus {
  if (!item) return 'BELUM_DISEMAK';
  if (item.status === 'DIHANTAR' || item.status === 'BELUM_HANTAR' || item.status === 'BELUM_DISEMAK') {
    return item.status;
  }
  if (item.submitted === true) {
    return 'DIHANTAR';
  }
  return 'BELUM_DISEMAK';
}

/**
 * Returns the next status in the cycle:
 * BELUM_DISEMAK -> DIHANTAR -> BELUM_HANTAR -> BELUM_DISEMAK
 */
export function getNextStatus(current: SubmissionStatus): SubmissionStatus {
  switch (current) {
    case 'BELUM_DISEMAK':
      return 'DIHANTAR';
    case 'DIHANTAR':
      return 'BELUM_HANTAR';
    case 'BELUM_HANTAR':
      return 'BELUM_DISEMAK';
    default:
      return 'BELUM_DISEMAK';
  }
}
