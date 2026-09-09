import type {CurrentUser, DocumentActionComponent, NewDocumentOptionsContext} from 'sanity'

import {canEditSiteNavigation} from '../schemaTypes/lib/canEditSiteNavigation'

const SITE_NAVIGATION_TYPE = 'siteNavigation'

const BLOCKED_SINGLETON_ACTIONS = new Set(['duplicate', 'delete'])
const WRITE_ACTIONS = new Set(['publish', 'unpublish', 'discardChanges'])

function actionName(action: DocumentActionComponent): string | undefined {
	return action.action
}

export function filterSiteNavigationActions(
	prev: DocumentActionComponent[],
	schemaType: string,
	currentUser?: CurrentUser | null,
): DocumentActionComponent[] {
	if (schemaType !== SITE_NAVIGATION_TYPE) return prev

	const canEdit = canEditSiteNavigation(currentUser)
	return prev.filter((action) => {
		const name = actionName(action)
		if (!name) return true
		if (BLOCKED_SINGLETON_ACTIONS.has(name)) return false
		if (!canEdit && WRITE_ACTIONS.has(name)) return false
		return true
	})
}

export function filterNewDocumentOptions<T extends {templateId: string}>(
	prev: T[],
	_context?: NewDocumentOptionsContext,
): T[] {
	return prev.filter((item) => item.templateId !== SITE_NAVIGATION_TYPE)
}

export function filterSchemaTemplates<T extends {schemaType?: string}>(prev: T[]): T[] {
	return prev.filter((template) => template.schemaType !== SITE_NAVIGATION_TYPE)
}
