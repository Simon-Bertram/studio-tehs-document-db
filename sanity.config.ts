import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {documentationTool, DocumentationNavbar} from './tools/documentation'
import {googleMapsInput} from '@sanity/google-maps-input'

export default defineConfig({
  name: 'default',
  title: 'tehs-document-db',

  projectId: 'z8o776vu',
  dataset: 'production',

  plugins: [
    structureTool({structure}),
    visionTool(),
    googleMapsInput({
      apiKey: process.env.SANITY_STUDIO_GOOGLE_MAPS_API_KEY ?? '',
      defaultZoom: 8,
      defaultRadiusZoom: 15, // zoom level for radius editing
      defaultLocation: {lat: 40.066344, lng: -75.455012},
      defaultRadius: 1000, // for geopointRadius fields
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
  },
})
