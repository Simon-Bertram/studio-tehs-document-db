import {at, defineMigration, setIfMissing, unset} from 'sanity/migrate'

export default defineMigration({
  title: 'Rename fields to archiveId and migrationKey',
  documentTypes: ['primarySource', 'historicalImage', 'township', 'category'],
  migrate: {
    document(doc) {
      if (doc._type === 'primarySource' && doc.docId && !doc.archiveId) {
        return [at('archiveId', setIfMissing(doc.docId)), at('docId', unset())]
      }

      if (doc._type === 'historicalImage' && doc.identifier && !doc.archiveId) {
        return [
          at('archiveId', setIfMissing(doc.identifier)),
          at('identifier', unset()),
        ]
      }

      if (doc._type === 'township' && doc.legacyKeyword && !doc.migrationKey) {
        return [
          at('migrationKey', setIfMissing(doc.legacyKeyword)),
          at('legacyKeyword', unset()),
        ]
      }

      if (doc._type === 'category' && doc.legacyIdentifier && !doc.migrationKey) {
        return [
          at('migrationKey', setIfMissing(doc.legacyIdentifier)),
          at('legacyIdentifier', unset()),
        ]
      }

      return []
    },
  },
})
