import {at, defineMigration, set, setIfMissing} from 'sanity/migrate'

const ASIDE_SIDES = new Set(['asideStart', 'asideEnd'])

/**
 * Collapse curatedEssay body image roles asideStart/asideEnd → aside.
 * Missing imageRole defaults to figure.
 */
export default defineMigration({
	title: 'Simplify imageRole to figure / aside',
	documentTypes: ['curatedEssay'],
	migrate: {
		document(doc) {
			const body = doc.body
			if (!Array.isArray(body)) return []

			const patches = []
			for (let i = 0; i < body.length; i++) {
				const block = body[i] as {
					_type?: string
					imageRole?: string
				} | null
				if (block?._type !== 'image') continue

				const role = block.imageRole
				if (role && ASIDE_SIDES.has(role)) {
					patches.push(at(['body', i, 'imageRole'], set('aside')))
				} else if (!role) {
					patches.push(
						at(['body', i, 'imageRole'], setIfMissing('figure')),
					)
				}
			}
			return patches
		},
	},
})
