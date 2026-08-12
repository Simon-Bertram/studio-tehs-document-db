import {BookIcon} from '@sanity/icons/Book'

import {DOCUMENTATION_TOOL_NAME} from './constants'
import {DocumentationTool} from './DocumentationTool'

export {DocumentationNavbar} from './DocumentationNavbar'
export {DOCUMENTATION_TOOL_NAME} from './constants'

export function documentationTool() {
	return {
		name: DOCUMENTATION_TOOL_NAME,
		title: 'Documentation',
		icon: BookIcon,
		component: DocumentationTool,
	}
}
