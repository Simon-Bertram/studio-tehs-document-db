import {ArchiveIcon} from '@sanity/icons/Archive'
import {BasketIcon} from '@sanity/icons/Basket'
import {BookIcon} from '@sanity/icons/Book'
import {CaseIcon} from '@sanity/icons/Case'
import {CogIcon} from '@sanity/icons/Cog'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {HomeIcon} from '@sanity/icons/Home'
import {ImageIcon} from '@sanity/icons/Image'
import {MarkerIcon} from '@sanity/icons/Marker'
import {PinIcon} from '@sanity/icons/Pin'
import {TagIcon} from '@sanity/icons/Tag'
import {TagsIcon} from '@sanity/icons/Tags'
import {UserIcon} from '@sanity/icons/User'
import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
	S.list()
		.title('Content')
		.items([
			S.listItem()
				.title('The Archive')
				.icon(ArchiveIcon)
				.child(
					S.list()
						.title('The Archive')
						.items([
							S.documentTypeListItem('primarySource')
								.title('Primary Sources / Transcriptions')
								.icon(DocumentTextIcon),
							S.documentTypeListItem('historicalImage')
								.title('Historical Images')
								.icon(ImageIcon),
							S.documentTypeListItem('donation')
								.title('Donations')
								.icon(BasketIcon),
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
							S.documentTypeListItem('quarterlyArticle')
								.title('TEHS Quarterly Articles')
								.icon(BookIcon),
						]),
				),
			S.listItem()
				.title('Taxonomies & Entities')
				.icon(CogIcon)
				.child(
					S.list()
						.title('Taxonomies & Entities')
						.items([
							S.documentTypeListItem('township')
								.title('Townships')
								.icon(PinIcon),
							S.documentTypeListItem('location')
								.title('Locations')
								.icon(MarkerIcon),
							S.documentTypeListItem('person')
								.title('Historical Persons')
								.icon(UserIcon),
							S.documentTypeListItem('familyLine')
								.title('Families / Lineages')
								.icon(UserIcon),
							S.documentTypeListItem('property')
								.title('Properties & Buildings')
								.icon(HomeIcon),
							S.documentTypeListItem('deed')
								.title('Deeds & Land Instruments')
								.icon(DocumentsIcon),
							S.listItem()
								.title('Organisations')
								.icon(CaseIcon)
								.child(
									S.list()
										.title('Organisations')
										.items([
											S.listItem()
												.title('Commercial / Industrial')
												.child(
													S.documentList()
														.title('Commercial / Industrial')
														.schemaType('business')
														.filter(
															'_type == "business" && businessType == "commercial"',
														)
														.initialValueTemplates([
															S.initialValueTemplateItem(
																'business-commercial',
															),
														]),
												),
											S.listItem()
												.title('Civic / Community')
												.child(
													S.documentList()
														.title('Civic / Community')
														.schemaType('business')
														.filter(
															'_type == "business" && businessType == "civic"',
														)
														.initialValueTemplates([
															S.initialValueTemplateItem(
																'business-civic',
															),
														]),
												),
											S.listItem()
												.title('Institutional')
												.child(
													S.documentList()
														.title('Institutional')
														.schemaType('business')
														.filter(
															'_type == "business" && businessType == "institutional"',
														)
														.initialValueTemplates([
															S.initialValueTemplateItem(
																'business-institutional',
															),
														]),
												),
											S.divider(),
											S.listItem()
												.title('All organisations')
												.child(
													S.documentTypeList('business').title(
														'All organisations',
													),
												),
										]),
								),
							S.documentTypeListItem('category')
								.title('Subject Categories')
								.icon(TagIcon),
							S.documentTypeListItem('donationCategory')
								.title('Donation Categories')
								.icon(TagsIcon),
						]),
				),
		])
