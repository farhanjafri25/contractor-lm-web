const EVENT_LABELS: Record<string, string> = {
  // Contractor
  'contractor.created': 'Contractor added',
  'contractor.onboarded': 'Contractor onboarded',
  'contractor.updated': 'Contractor updated',
  'contractor.deleted': 'Contractor deleted',
  'contractor.bulk_imported': 'Bulk import started',

  // Access
  'access.granted': 'Access granted',
  'access.revoked': 'Access removed',
  'access.revocation_failed': 'Access removal failed',

  // Contract
  'contract.extended': 'Contract extended',
  'contract.suspended': 'Contract suspended',
  'contract.reactivated': 'Contract reactivated',
  'contract.expired': 'Contract expired',
  'contract.terminated': 'Contract ended',

  // Extension/Sponsor Flow
  'onboarding.requested': 'Onboarding request sent',
  'extension.request_submitted': 'Extension requested',
  'extension.request_approved': 'Extension approved',
  'extension.request_rejected': 'Extension rejected',
  'termination.request_submitted': 'Termination requested',
  'termination.request_approved': 'Termination approved',
  'termination.request_rejected': 'Termination rejected',
  'sponsor.reminder_sent': 'Reminder sent to sponsor',
  'sponsor.no_response': 'Sponsor failed to respond',

  // Directory
  'directory_sync.success': 'Directory sync successful',
  'directory_sync.failed': 'Directory sync failed',
};

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getEventLabel(type: string) {
  if (EVENT_LABELS[type]) {
    return EVENT_LABELS[type];
  }

  return titleCase(type.replace(/[._]/g, ' '));
}

export const eventTypeOptions = Object.entries(EVENT_LABELS).map(([value, label]) => ({
  value,
  label,
}));
