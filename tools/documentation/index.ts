import {BookIcon} from '@sanity/icons/Book'
import {DocumentationTool} from './DocumentationTool'

export function documentationTool() {
  return {
    name: 'documentation',
    title: 'Documentation',
    icon: BookIcon,
    component: DocumentationTool,
  }
}
