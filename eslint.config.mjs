import studio from '@sanity/eslint-config-studio'
import prettier from 'eslint-plugin-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import importPlugin from 'eslint-plugin-import'

export default [
	{
		ignores: ['dist/**', 'node_modules/**', '.sanity/**', 'documentation/**'],
	},
	...studio,
	{
		files: ['**/*.ts', '**/*.tsx'],
		plugins: {
			prettier,
			'simple-import-sort': simpleImportSort,
			import: importPlugin,
		},
		rules: {
			'prettier/prettier': 'error',
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'typescript/consistent-type-imports': 'error',
			'import/no-default-export': 'error',
		},
	},
	{
		files: ['**/sanity.config.ts', '**/sanity.cli.ts'],
		rules: {
			'import/no-default-export': 'off',
		},
	},
]
