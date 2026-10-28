/**
 * Fetch HTML with a browser-like UA (DreamHost / tehistory).
 */
export const FETCH_HEADERS: Record<string, string> = {
	'User-Agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

export async function fetchHtml(
	url: string,
): Promise<{ok: boolean; status: number; text: string}> {
	const res = await fetch(url, {headers: FETCH_HEADERS})
	const text = await res.text()
	return {ok: res.ok, status: res.status, text}
}
