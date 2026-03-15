const EVENT_LABELS: Record<string, string> = {
  'contractor.created': 'Contractor added',
  'contractor.updated': 'Contractor updated',
  'contract.extended': 'Contract extended',
  'contract.suspended': 'Contract suspended',
  'contract.reactivated': 'Contract reactivated',
  'contract.expired': 'Contract expired',
  'contract.terminated': 'Contract ended',
  'access.provisioned': 'Access granted',
  'access.revoked': 'Access removed',
  'sponsor.action.submitted': 'Request sent',
  'sponsor.action.approved': 'Request approved',
  'sponsor.action.rejected': 'Request rejected',
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
