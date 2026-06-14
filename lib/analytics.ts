// Analytics abstraction. Wraps PostHog when NEXT_PUBLIC_POSTHOG_KEY is set.
// Never call posthog directly in components — always use this.

type Props = Record<string, string | number | boolean | null | undefined>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const posthog: any;

export function track(event: string, props?: Props): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    if (typeof posthog !== 'undefined') {
      posthog.capture(event, props);
    }
  } catch {
    // ignore — posthog not yet loaded
  }
}
