class AnalyticsService {
    trackEvent(eventName: string, properties?: Record<string, any>) {
        console.log(`[Analytics] ${eventName}`, properties);

        // Send to background for unified tracking/persistence if needed
        chrome.runtime.sendMessage({
            type: 'TRACK_EVENT',
            name: eventName,
            properties: properties
        }).catch(() => {
            // Handle cases where extension context is invalidated (e.g. after update)
        });
    }
}

export const analyticsService = new AnalyticsService();
