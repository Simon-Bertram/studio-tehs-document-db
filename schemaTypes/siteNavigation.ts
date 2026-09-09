import {LinkIcon} from '@sanity/icons/Link'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {canEditSiteNavigation} from './lib/canEditSiteNavigation'
import {
	SITE_NAVIGATION_PRIMARY_LINKS,
	SITE_NAVIGATION_SECONDARY_LINKS,
} from './lib/siteNavigationSeed'
import {validateSiteNavigationMenus} from './lib/siteNavigationValidation'

type NavLinkValue = {
	href?: string
	kind?: string
}

export const siteNavigation = defineType({
	name: 'siteNavigation',
	title: 'Public site navigation',
	type: 'document',
	icon: LinkIcon,
	description:
		'Header and Explore/footer menus for the public Astro site. One document only. Contributors who catalog archive items cannot change this menu.',
	components: {
		input: DocumentWithDescription,
	},
	readOnly: ({currentUser}) => !canEditSiteNavigation(currentUser),
	fieldsets: [
		{
			name: 'primary',
			title: 'Header — always visible',
			options: {collapsible: false},
		},
		{
			name: 'secondary',
			title: 'Explore, footer, and sidebars',
			options: {collapsible: false},
		},
	],
	fields: [
		defineField({
			name: 'primaryLinks',
			title: 'Header links',
			type: 'array',
			fieldset: 'primary',
			description:
				'Top bar. Keep this short. Search is a kind of item, not a separate setting — the website renders it as the search field.',
			of: [defineArrayMember({type: 'navLink'})],
			validation: (Rule) => [
				Rule.max(8).error('Keep the header to 8 items or fewer'),
				Rule.max(6).warning('A short header (6 items or fewer) is easier to scan'),
				Rule.custom((primaryLinks, context) =>
					validateSiteNavigationMenus(
						primaryLinks as NavLinkValue[] | undefined,
						context.document?.secondaryLinks as NavLinkValue[] | undefined,
					),
				),
			],
		}),
		defineField({
			name: 'secondaryLinks',
			title: 'Explore links',
			type: 'array',
			fieldset: 'secondary',
			description:
				'Homepage Explore, collection sidebars, and footer. Not the top bar. Remove About if this site later sits under tehistory.org chrome.',
			of: [defineArrayMember({type: 'navLink'})],
			validation: (Rule) =>
				Rule.custom((secondaryLinks, context) =>
					validateSiteNavigationMenus(
						context.document?.primaryLinks as NavLinkValue[] | undefined,
						secondaryLinks as NavLinkValue[] | undefined,
					),
				),
		}),
	],
	initialValue: {
		primaryLinks: SITE_NAVIGATION_PRIMARY_LINKS,
		secondaryLinks: SITE_NAVIGATION_SECONDARY_LINKS,
	},
	preview: {
		prepare() {
			return {
				title: 'Public site navigation',
				subtitle: 'Header and Explore menus',
			}
		},
	},
})
