import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {documentationTool} from './tools/documentation'

export default defineConfig({
  name: 'default',
  title: 'tehs-document-db',

  projectId: 'z8o776vu',
  dataset: 'production',

  plugins: [structureTool({structure}), visionTool()],

  tools: [documentationTool()],

  schema: {
    types: schemaTypes,
  },
})
