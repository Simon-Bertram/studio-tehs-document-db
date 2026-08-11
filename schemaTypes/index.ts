import {business} from './business'
import {category} from './category'
import {deed} from './deed'
import {donation} from './donation'
import {donationCategory} from './donationCategory'
import {familyLine} from './familyLine'
import {historicalImage} from './historicalImage'
import {location} from './location'
import {censusRecord} from './objects/censusRecord'
import {historicalDate} from './objects/historicalDate'
import {immediateRelative} from './objects/immediateRelative'
import {internalSubLinks} from './objects/internalSubLinks'
import {mapEmbed} from './objects/mapEmbed'
import {pageBreak} from './objects/pageBreak'
import {person} from './person'
import {primarySource} from './primarySource'
import {property} from './property'
import {quarterlyArticle} from './quarterlyArticle'
import {researchArticle} from './researchArticle'
import {township} from './township'

export const schemaTypes = [
	category,
	township,
	person,
	property,
	deed,
	business,
	quarterlyArticle,
	location,
	historicalImage,
	primarySource,
	researchArticle,
	familyLine,
	donation,
	donationCategory,
	mapEmbed,
	internalSubLinks,
	censusRecord,
	historicalDate,
	immediateRelative,
	pageBreak,
]
