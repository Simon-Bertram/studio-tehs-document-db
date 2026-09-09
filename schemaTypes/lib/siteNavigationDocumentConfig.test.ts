import {describe, expect, test} from 'bun:test'
import type {DocumentActionComponent} from 'sanity'

import {
	filterNewDocumentOptions,
	filterSchemaTemplates,
	filterSiteNavigationActions,
} from '../../lib/siteNavigationDocumentConfig'

function action(name: string): DocumentActionComponent {
	const component = (() => null) as DocumentActionComponent
	component.action = name
	return component
}

describe('filterSiteNavigationActions', () => {
	const prev = ['publish', 'unpublish', 'discardChanges', 'duplicate', 'delete', 'restore'].map(
		action,
	)

	test('leaves other types unchanged', () => {
		expect(filterSiteNavigationActions(prev, 'historicalImage', {id: 'u', roles: []})).toEqual(prev)
	})

	test('always removes duplicate and delete on the singleton', () => {
		const next = filterSiteNavigationActions(prev, 'siteNavigation', {
			id: 'u',
			roles: [{name: 'editor', title: 'Editor'}],
		})
		expect(next.map((item) => item.action)).toEqual([
			'publish',
			'unpublish',
			'discardChanges',
			'restore',
		])
	})

	test('strips write actions for contributors', () => {
		const next = filterSiteNavigationActions(prev, 'siteNavigation', {
			id: 'u',
			roles: [{name: 'contributor', title: 'Contributor'}],
		})
		expect(next.map((item) => item.action)).toEqual(['restore'])
	})
})

describe('filterNewDocumentOptions', () => {
	test('hides the singleton from Create', () => {
		expect(
			filterNewDocumentOptions([{templateId: 'historicalImage'}, {templateId: 'siteNavigation'}]),
		).toEqual([{templateId: 'historicalImage'}])
	})
})

describe('filterSchemaTemplates', () => {
	test('drops the default siteNavigation template', () => {
		expect(
			filterSchemaTemplates([{schemaType: 'historicalImage'}, {schemaType: 'siteNavigation'}]),
		).toEqual([{schemaType: 'historicalImage'}])
	})
})
