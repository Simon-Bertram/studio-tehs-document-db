/**
 * Fetch HTML/text from tehistory.org with a browser-like UA.
 */

export const FETCH_HEADERS = {
	'User-Agent': 'Mozilla/5.0 (compatible; TEHS-catalog-import/1.0)',
}

export async function fetchText(url: string): Promise<{ok: boolean; status: number; text: string}> {
	const res = await fetch(url, {headers: FETCH_HEADERS})
	const text = await res.text()
	return {ok: res.ok, status: res.status, text}
}
