import {BookIcon} from '@sanity/icons/Book'
import {DocumentationNavbar} from './DocumentationNavbar'
import {DocumentationTool} from './DocumentationTool'

export {DocumentationNavbar} from './DocumentationNavbar'

export function documentationTool() {
  return {
    name: 'editor-docs',
    title: 'Documentation',
    icon: BookIcon,
    component: DocumentationTool,
  }
}
