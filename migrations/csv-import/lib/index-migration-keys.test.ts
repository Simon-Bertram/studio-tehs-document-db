import {describe, expect, test} from 'bun:test'

import {indexMigrationKeys} from './index-migration-keys'

describe('indexMigrationKeys', () => {
	test('maps Inns and alias Inn to the same id', () => {
		const lookup = indexMigrationKeys([
			{
				_id: 'drafts.inns-id',
				migrationKey: 'Inns',
				migrationKeyAliases: ['Inn'],
			},
		])

		expect(lookup.inns).toBe('inns-id')
		expect(lookup.inn).toBe('inns-id')
	})

	test('ignores empty keys and aliases', () => {
		const lookup = indexMigrationKeys([
			{
				_id: 'cat-1',
				migrationKey: '  ',
				migrationKeyAliases: ['', '  Mill  '],
			},
		])

		expect(lookup).toEqual({mill: 'cat-1'})
	})

	test('warns on collision and keeps the later document', () => {
		const collisions: string[] = []
		const lookup = indexMigrationKeys(
			[
				{_id: 'first', migrationKey: 'Inn'},
				{_id: 'second', migrationKey: 'Inns', migrationKeyAliases: ['Inn']},
			],
			(key, existingId, incomingId) => {
				collisions.push(`${key}:${existingId}:${incomingId}`)
			},
		)

		expect(collisions).toEqual(['inn:first:second'])
		expect(lookup.inn).toBe('second')
		expect(lookup.inns).toBe('second')
	})
})
