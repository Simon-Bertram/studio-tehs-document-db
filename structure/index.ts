import {ArchiveIcon} from '@sanity/icons/Archive'
import {BasketIcon} from '@sanity/icons/Basket'
import {BookIcon} from '@sanity/icons/Book'
import {CaseIcon} from '@sanity/icons/Case'
import {CogIcon} from '@sanity/icons/Cog'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {EarthAmericasIcon} from '@sanity/icons/EarthAmericas'
import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {EditIcon} from '@sanity/icons/Edit'
import {HomeIcon} from '@sanity/icons/Home'
import {ImageIcon} from '@sanity/icons/Image'
import {MarkerIcon} from '@sanity/icons/Marker'
import {PinIcon} from '@sanity/icons/Pin'
import {TagIcon} from '@sanity/icons/Tag'
import {TagsIcon} from '@sanity/icons/Tags'
import {UserIcon} from '@sanity/icons/User'
import {UsersIcon} from '@sanity/icons/Users'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'

function quarterlyIssueChild(S: StructureBuilder, issueId: string) {
	return S.list()
		.title('Issue')
		.items([
			S.listItem()
				.title('Edit issue')
				.id('edit')
				.icon(EditIcon)
				.child(S.document().schemaType('quarterlyIssue').documentId(issueId)),
			S.listItem()
				.title('Articles in this issue')
				.id('articles')
				.icon(DocumentTextIcon)
				.child(
					S.documentList()
						.title('Articles in this issue')
						.schemaType('quarterlyArticle')
						.filter('_type == "quarterlyArticle" && issueRef._ref == $issueId')
						.params({issueId})
						.defaultOrdering([{field: 'startPage', direction: 'asc'}])
						.initialValueTemplates([
							S.initialValueTemplateItem('quarterlyArticle-from-issue', {issueId}),
						]),
				),
		])
}

export const structure: StructureResolver = (S) =>
	S.list()
		.title('Content')
		.items([
			S.listItem()
				.title('Information Sources')
				.icon(ArchiveIcon)
				.child(
					S.list()
						.title('Information Sources')
						.items([
							S.documentTypeListItem('primarySource')
								.title('Primary Sources / Transcriptions')
								.icon(DocumentTextIcon),
							S.documentTypeListItem('historicalImage').title('Historical Images').icon(ImageIcon),
							S.documentTypeListItem('donation').title('Donations').icon(BasketIcon),
						]),
				),
			S.listItem()
				.title('The Website')
				.icon(EarthGlobeIcon)
				.child(
					S.list()
						.title('The Website')
						.items([
							S.documentTypeListItem('researchArticle')
								.title('Research Articles & Overviews')
								.icon(BookIcon),
							S.listItem()
								.title('TEHS Quarterly Issues')
								.icon(BookIcon)
								.schemaType('quarterlyIssue')
								.child(
									S.documentTypeList('quarterlyIssue')
										.title('TEHS Quarterly Issues')
										.defaultOrdering([
											{field: 'volume', direction: 'asc'},
											{field: 'issueNumber', direction: 'asc'},
										])
										.child((issueId) => quarterlyIssueChild(S, issueId)),
								),
							S.documentTypeListItem('quarterlyArticle')
								.title('TEHS Quarterly Articles')
								.icon(DocumentTextIcon),
						]),
				),
			S.listItem()
				.title('Taxonomies & Entities')
				.icon(CogIcon)
				.child(
					S.list()
						.title('Taxonomies & Entities')
						.items([
							S.documentTypeListItem('county').title('Counties').icon(EarthAmericasIcon),
							S.documentTypeListItem('township').title('Townships').icon(PinIcon),
							S.documentTypeListItem('location').title('Locations').icon(MarkerIcon),
							S.documentTypeListItem('person').title('Historical Persons').icon(UserIcon),
							S.documentTypeListItem('familyLine').title('Families / Lineages').icon(UserIcon),
							S.documentTypeListItem('property').title('Properties & Buildings').icon(HomeIcon),
							S.documentTypeListItem('deed').title('Deeds & Land Instruments').icon(DocumentsIcon),
							S.documentTypeListItem('business').title('Businesses').icon(CaseIcon),
							S.documentTypeListItem('organization').title('Organizations').icon(UsersIcon),
							S.documentTypeListItem('category').title('Subject Categories').icon(TagIcon),
							S.documentTypeListItem('donationCategory')
								.title('Donation Categories')
								.icon(TagsIcon),
						]),
				),
		])
