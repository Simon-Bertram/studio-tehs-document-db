import {describe, expect, test} from 'bun:test'

import {canEditSiteNavigation} from './canEditSiteNavigation'

describe('canEditSiteNavigation', () => {
	test('allows administrator, editor, and developer', () => {
		expect(canEditSiteNavigation({roles: [{name: 'administrator'}]})).toBe(true)
		expect(canEditSiteNavigation({roles: [{name: 'editor'}]})).toBe(true)
		expect(canEditSiteNavigation({roles: [{name: 'developer'}]})).toBe(true)
	})

	test('denies contributor, viewer, and missing roles', () => {
		expect(canEditSiteNavigation({roles: [{name: 'contributor'}]})).toBe(false)
		expect(canEditSiteNavigation({roles: [{name: 'viewer'}]})).toBe(false)
		expect(canEditSiteNavigation({roles: []})).toBe(false)
		expect(canEditSiteNavigation(undefined)).toBe(false)
	})

	test('allows a user who also holds a lower-privilege role', () => {
		expect(
			canEditSiteNavigation({
				roles: [{name: 'contributor'}, {name: 'editor'}],
			}),
		).toBe(true)
	})
})
