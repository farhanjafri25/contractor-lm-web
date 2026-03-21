export function deriveWorkspaceName(
  profile: Record<string, unknown> | undefined,
  email: string | undefined,
) {
  const candidates = [
    profile?.tenant_name,
    profile?.name,
    profile?.display_name,
    profile?.company_name,
    profile?.organization_name,
  ];

  const named = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  if (named) {
    return String(named);
  }

  if (email?.includes('@')) {
    const domain = email.split('@')[1] ?? '';
    const company = domain.split('.')[0] ?? '';
    if (company) {
      return company.charAt(0).toUpperCase() + company.slice(1);
    }
  }

  return 'Workspace';
}
