import {ArchiveIcon} from '@sanity/icons/Archive'
import {BookIcon} from '@sanity/icons/Book'
import {CaseIcon} from '@sanity/icons/Case'
import {CogIcon} from '@sanity/icons/Cog'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {HomeIcon} from '@sanity/icons/Home'
import {ImageIcon} from '@sanity/icons/Image'
import {MarkerIcon} from '@sanity/icons/Marker'
import {PinIcon} from '@sanity/icons/Pin'
import {TagIcon} from '@sanity/icons/Tag'
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
            ]),
        ),
      S.listItem()
        .title('The Website')
        .icon(EarthGlobeIcon)
        .child(
          S.list()
            .title('The Website')
            .items([
              S.documentTypeListItem('curatedEssay')
                .title('Curated Essays & Overviews')
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
              S.documentTypeListItem('township').title('Townships').icon(PinIcon),
              S.documentTypeListItem('location').title('Locations').icon(MarkerIcon),
              S.documentTypeListItem('person').title('Historical Persons').icon(UserIcon),
              S.documentTypeListItem('familyLine')
                .title('Families / Lineages')
                .icon(UserIcon),
              S.documentTypeListItem('property')
                .title('Properties & Buildings')
                .icon(HomeIcon),
              S.documentTypeListItem('business').title('Businesses').icon(CaseIcon),
              S.documentTypeListItem('category')
                .title('Subject Categories')
                .icon(TagIcon),
            ]),
        ),
    ])
