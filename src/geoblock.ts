const COUNTRY_CHECK_TIMEOUT_MS = 3500;
const DEFAULT_BLOCKED_COUNTRY_CODES = ['RU'];

const COUNTRY_SOURCES = [
	'https://ipapi.co/json/',
	'https://ipwho.is/',
];

type GeoApiResponse = {
	country?: string;
	country_code?: string;
	countryCode?: string;
};

const withTimeout = async (url: string) => {
	const controller = new AbortController();
	const timeoutId = window.setTimeout(
		() => controller.abort(),
		COUNTRY_CHECK_TIMEOUT_MS,
	);

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
			signal: controller.signal,
			cache: 'no-store',
		});

		if (!response.ok) {
			return null;
		}

		return (await response.json()) as GeoApiResponse;
	} catch {
		return null;
	} finally {
		window.clearTimeout(timeoutId);
	}
};

const extractCountryCode = (payload: GeoApiResponse | null) => {
	if (!payload) {
		return null;
	}

	const rawCountryCode =
		payload.country_code ?? payload.countryCode ?? payload.country;

	if (!rawCountryCode || typeof rawCountryCode !== 'string') {
		return null;
	}

	const normalized = rawCountryCode.trim().toUpperCase();
	return normalized.length === 2 ? normalized : null;
};

const normalizeCountryCode = (rawCode: string) => {
	const normalized = rawCode.trim().toUpperCase();
	return normalized.length === 2 ? normalized : null;
};

export const getBlockedCountryCodes = () => {
	const envList = import.meta.env.VITE_BLOCKED_COUNTRY_CODES;

	if (!envList || !envList.trim()) {
		return new Set(DEFAULT_BLOCKED_COUNTRY_CODES);
	}

	const normalizedList = envList
		.split(',')
		.map((code) => normalizeCountryCode(code))
		.filter((code): code is string => Boolean(code));

	if (normalizedList.length === 0) {
		return new Set(DEFAULT_BLOCKED_COUNTRY_CODES);
	}

	return new Set(normalizedList);
};

export const detectVisitorCountryCode = async (): Promise<string | null> => {
	if (typeof window === 'undefined') {
		return null;
	}

	for (const source of COUNTRY_SOURCES) {
		const payload = await withTimeout(source);
		const countryCode = extractCountryCode(payload);

		if (countryCode) {
			return countryCode;
		}
	}

	return null;
};
