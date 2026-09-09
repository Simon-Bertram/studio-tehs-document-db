import {describe, expect, test} from 'bun:test'

import {isSitePath, validateSiteNavigationMenus} from './siteNavigationValidation'

describe('isSitePath', () => {
	test('accepts root and internal paths', () => {
		expect(isSitePath('/')).toBe(true)
		expect(isSitePath('/quarterly')).toBe(true)
		expect(isSitePath('/images/MF37')).toBe(true)
	})

	test('rejects empty, external, and query strings', () => {
		expect(isSitePath('')).toBe(false)
		expect(isSitePath(undefined)).toBe(false)
		expect(isSitePath('https://tehistory.org')).toBe(false)
		expect(isSitePath('/search?q=paoli')).toBe(false)
	})
})

describe('validateSiteNavigationMenus', () => {
	test('rejects duplicate paths across both menus', () => {
		expect(
			validateSiteNavigationMenus(
				[{href: '/images', kind: 'page'}],
				[{href: '/images', kind: 'page'}],
			),
		).toBe('Each path can appear only once across the header and Explore menus')
	})

	test('rejects a second Search item', () => {
		expect(
			validateSiteNavigationMenus(
				[{href: '/search', kind: 'search'}],
				[{href: '/find', kind: 'search'}],
			),
		).toBe('Only one Search item is allowed')
	})

	test('allows the seeded menus', () => {
		expect(
			validateSiteNavigationMenus(
				[
					{href: '/', kind: 'page'},
					{href: '/search', kind: 'search'},
				],
				[{href: '/places', kind: 'page'}],
			),
		).toBe(true)
	})
})
