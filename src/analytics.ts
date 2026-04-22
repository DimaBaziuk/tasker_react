import { logEvent, setConsent } from 'firebase/analytics';
import { initFirebaseAnalytics } from './firebase';

export type AnalyticsConsentChoice = 'granted' | 'denied';

const CONSENT_STORAGE_KEY = 'tasker-analytics-consent-v1';

type AnalyticsEventParams = Record<
	string,
	string | number | boolean | null | undefined
>;

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
	}
}

const sanitizeParams = (params: AnalyticsEventParams) =>
	Object.entries(params).reduce<Record<string, string | number | boolean>>(
		(accumulator, [key, value]) => {
			if (value === null || value === undefined) {
				return accumulator;
			}

			accumulator[key] = value;
			return accumulator;
		},
		{},
	);

export const getStoredAnalyticsConsent = (): AnalyticsConsentChoice | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	const storedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);

	if (storedConsent === 'granted' || storedConsent === 'denied') {
		return storedConsent;
	}

	return null;
};

export const setAnalyticsConsentChoice = async (
	consent: AnalyticsConsentChoice,
): Promise<void> => {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);

	window.gtag?.('consent', 'update', {
		analytics_storage: consent,
		ad_storage: 'denied',
		ad_user_data: 'denied',
		ad_personalization: 'denied',
	});

	const analytics = await initFirebaseAnalytics();

	if (!analytics) {
		return;
	}

	setConsent({
		analytics_storage: consent,
		ad_storage: 'denied',
		ad_user_data: 'denied',
		ad_personalization: 'denied',
	});
};

export const hasAnalyticsConsent = () =>
	getStoredAnalyticsConsent() === 'granted';

export const trackEvent = async (
	eventName: string,
	params: AnalyticsEventParams = {},
): Promise<void> => {
	if (!hasAnalyticsConsent()) {
		return;
	}

	const analytics = await initFirebaseAnalytics();

	if (!analytics) {
		return;
	}

	logEvent(analytics, eventName, sanitizeParams(params));
};

export const trackPageView = async (params: {
	page_path: string;
	page_title?: string;
	page_location?: string;
}) => {
	await trackEvent('page_view', {
		page_path: params.page_path,
		page_title: params.page_title,
		page_location: params.page_location,
	});
};
