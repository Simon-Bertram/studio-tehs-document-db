import {BookIcon} from '@sanity/icons/Book'
import {Button} from '@sanity/ui'
import {useCallback} from 'react'
import type {NavbarAction, NavbarProps} from 'sanity'
import {useRouter, useRouterState, useStateLink} from 'sanity/router'

import {DOCUMENTATION_TOOL_NAME} from './constants'

export {DOCUMENTATION_TOOL_NAME} from './constants'

const EMPTY_ACTIONS: NavbarAction[] = []

function getDocumentationState() {
	return {
		tool: DOCUMENTATION_TOOL_NAME,
		[DOCUMENTATION_TOOL_NAME]: undefined,
	}
}

function DocumentationTopbarButton({isSelected}: {isSelected: boolean}) {
	const {href, onClick} = useStateLink({state: getDocumentationState()})

	return (
		<Button
			as="a"
			href={href}
			icon={BookIcon}
			mode="bleed"
			onClick={onClick}
			selected={isSelected}
			text="Documentation"
			title="Editor documentation"
			tone="primary"
		/>
	)
}

export function DocumentationNavbar(props: NavbarProps) {
	const router = useRouter()
	const activeTool = useRouterState((state) =>
		typeof state.tool === 'string' ? state.tool : undefined,
	)
	const isDocumentationActive = activeTool === DOCUMENTATION_TOOL_NAME
	// `__internal_actions` is a private Sanity Studio navbar API (not in public
	// NavbarProps docs). It is the supported-in-practice way to inject topbar
	// and sidebar actions until a public navbar-actions API ships.
	//
	// Upgrade checklist when bumping `sanity`:
	// 1. Search Sanity release notes / changelog for navbar actions / NavbarProps.
	// 2. Confirm `__internal_actions` still exists on NavbarProps (or find rename).
	// 3. Smoke-test Documentation topbar + sidebar entries open the docs tool.
	// 4. If the prop is removed, replace with the public API or a custom navbar
	//    that still calls renderDefault without dropping other actions.
	const existingActions = props.__internal_actions ?? EMPTY_ACTIONS

	const handleOpenDocumentation = useCallback(() => {
		router.navigate({state: getDocumentationState()})
	}, [router])

	const renderDocumentationTopbar = useCallback(
		() => <DocumentationTopbarButton isSelected={isDocumentationActive} />,
		[isDocumentationActive],
	)

	const docsActions: NavbarAction[] = [
		{
			location: 'topbar',
			name: 'documentation-topbar',
			render: renderDocumentationTopbar,
		},
		{
			icon: BookIcon,
			location: 'sidebar',
			name: 'documentation-sidebar',
			onAction: handleOpenDocumentation,
			selected: isDocumentationActive,
			title: 'Documentation',
		},
	]

	return props.renderDefault({
		...props,
		__internal_actions: [...existingActions, ...docsActions],
	})
}
