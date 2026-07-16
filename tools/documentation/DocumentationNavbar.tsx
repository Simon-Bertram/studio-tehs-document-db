import {useCallback} from 'react'
import {BookIcon} from '@sanity/icons/Book'
import {Button} from '@sanity/ui'
import type {NavbarAction, NavbarProps} from 'sanity'
import {useRouter, useRouterState, useStateLink} from 'sanity/router'

export const DOCUMENTATION_TOOL_NAME = 'editor-docs'

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
