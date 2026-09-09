import {business} from './business'
import {category} from './category'
import {county} from './county'
import {deed} from './deed'
import {donation} from './donation'
import {donationCategory} from './donationCategory'
import {familyLine} from './familyLine'
import {historicalImage} from './historicalImage'
import {location} from './location'
import {censusRecord} from './objects/censusRecord'
import {historicalDate} from './objects/historicalDate'
import {historicalImageEmbed} from './objects/historicalImageEmbed'
import {immediateRelative} from './objects/immediateRelative'
import {internalSubLinks} from './objects/internalSubLinks'
import {mapEmbed} from './objects/mapEmbed'
import {navLink} from './objects/navLink'
import {pageBreak} from './objects/pageBreak'
import {thenAndNowView} from './objects/thenAndNowView'
import {organization} from './organization'
import {person} from './person'
import {primarySource} from './primarySource'
import {property} from './property'
import {quarterlyArticle} from './quarterlyArticle'
import {quarterlyIssue} from './quarterlyIssue'
import {researchArticle} from './researchArticle'
import {siteNavigation} from './siteNavigation'
import {thenAndNow} from './thenAndNow'
import {township} from './township'

export const schemaTypes = [
	category,
	county,
	township,
	person,
	property,
	deed,
	business,
	organization,
	quarterlyIssue,
	quarterlyArticle,
	location,
	historicalImage,
	primarySource,
	researchArticle,
	thenAndNow,
	familyLine,
	donation,
	donationCategory,
	siteNavigation,
	mapEmbed,
	historicalImageEmbed,
	thenAndNowView,
	internalSubLinks,
	navLink,
	censusRecord,
	historicalDate,
	immediateRelative,
	pageBreak,
]
