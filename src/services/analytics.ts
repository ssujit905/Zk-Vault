class AnalyticsService {
    trackEvent(eventName: string, properties?: Record<string, any>) {
        console.log(`[Analytics] ${eventName}`, properties);

        // In a real extension, we would send this to a backend or a service like Mixpanel/PostHog
        // chrome.runtime.sendMessage({ type: 'TRACK_EVENT', name: eventName, props: properties });
    }
}

export const analyticsService = new AnalyticsService();
