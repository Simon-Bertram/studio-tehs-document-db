import {at, defineMigration, set, unset} from 'sanity/migrate'

const LABEL_TO_VALUE: Record<string, string> = {
	Spouse: 'spouse',
	Parent: 'parent',
	Child: 'child',
	Sibling: 'sibling',
	Cousin: 'cousin',
	Other: 'other',
}

/**
 * Rewrite person.immediateRelatives[].relationshipType from display
 * labels (e.g. "Spouse") to stable slug values (e.g. "spouse").
 */
export default defineMigration({
	title: 'Normalize relationshipType to slug values',
	documentTypes: ['person'],
	migrate: {
		document(doc) {
			const relatives = doc.immediateRelatives
			if (!Array.isArray(relatives)) return []

			const patches = []
			for (let i = 0; i < relatives.length; i++) {
				const rel = relatives[i] as {relationshipType?: string} | null
				const current = rel?.relationshipType
				if (!current || !(current in LABEL_TO_VALUE)) continue
				patches.push(
					at(
						['immediateRelatives', i, 'relationshipType'],
						set(LABEL_TO_VALUE[current]),
					),
				)
			}
			return patches
		},
	},
})
