import {googleMapsInput} from '@sanity/google-maps-input'
import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {SANITY_DATASET, SANITY_PROJECT_ID} from './lib/sanityEnv'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {DocumentationNavbar, documentationTool} from './tools/documentation'

export default defineConfig({
	name: 'default',
	title: 'tehs-document-db',

	projectId: SANITY_PROJECT_ID,
	dataset: SANITY_DATASET,

	plugins: [
		structureTool({structure}),
		visionTool(),
		googleMapsInput({
			apiKey: process.env.SANITY_STUDIO_GOOGLE_MAPS_API_KEY ?? '',
			defaultZoom: 8,
			defaultRadiusZoom: 15,
			defaultLocation: {lat: 40.066344, lng: -75.455012},
			defaultRadius: 1000,
		}),
	],

	tools: [documentationTool()],

	studio: {
		components: {
			navbar: DocumentationNavbar,
		},
	},

	schema: {
		types: schemaTypes,
		templates: (prev) => [
			...prev,
			{
				id: 'business-commercial',
				title: 'Commercial organisation',
				schemaType: 'business',
				value: {businessType: 'commercial'},
			},
			{
				id: 'business-civic',
				title: 'Civic organisation',
				schemaType: 'business',
				value: {businessType: 'civic'},
			},
			{
				id: 'business-institutional',
				title: 'Institutional organisation',
				schemaType: 'business',
				value: {businessType: 'institutional'},
			},
		],
	},
})
