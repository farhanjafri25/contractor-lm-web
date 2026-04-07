import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window === 'undefined') return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // We handle this manually with the PageViewTracker
    capture_pageleave: true,
  });

  return posthog;
}
