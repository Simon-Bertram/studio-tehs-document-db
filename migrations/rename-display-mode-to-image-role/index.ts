import {at, defineMigration, setIfMissing, unset} from 'sanity/migrate'

const DISPLAY_MODE_TO_ROLE: Record<string, string> = {
	full: 'figure',
	left: 'asideStart',
	right: 'asideEnd',
}

/**
 * Rename curatedEssay body image `displayMode` → semantic `imageRole`.
 * Preserves meaning: full→figure, left→asideStart, right→asideEnd.
 */
export default defineMigration({
	title: 'Rename displayMode to semantic imageRole',
	documentTypes: ['researchArticle'],
	migrate: {
		document(doc) {
			const body = doc.body
			if (!Array.isArray(body)) return []

			const patches = []
			for (let i = 0; i < body.length; i++) {
				const block = body[i] as {
					_type?: string
					displayMode?: string
					imageRole?: string
				} | null
				if (block?._type !== 'image') continue

				const mode = block.displayMode
				if (mode && mode in DISPLAY_MODE_TO_ROLE && !block.imageRole) {
					patches.push(at(['body', i, 'imageRole'], setIfMissing(DISPLAY_MODE_TO_ROLE[mode])))
					patches.push(at(['body', i, 'displayMode'], unset()))
				} else if (mode && !block.imageRole) {
					patches.push(at(['body', i, 'imageRole'], setIfMissing('figure')))
					patches.push(at(['body', i, 'displayMode'], unset()))
				} else if (mode) {
					patches.push(at(['body', i, 'displayMode'], unset()))
				}
			}
			return patches
		},
	},
})
