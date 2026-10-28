/**
 * Paths for the 18c Tredyffrin HTML migration artifacts.
 */
import path from 'node:path'

export const HTML_18C_ROOT = path.resolve('migrations/html-18c')
export const EXTRACTED_DIR = path.join(HTML_18C_ROOT, 'extracted')
export const TRANSFORMED_DIR = path.join(HTML_18C_ROOT, 'transformed')
export const REPORTS_DIR = path.join(HTML_18C_ROOT, 'reports')
export const REVIEW_DIR = path.join(HTML_18C_ROOT, 'review')

export const MANIFEST_PATH = path.join(EXTRACTED_DIR, 'manifest.json')
export const LINK_INVENTORY_PATH = path.join(REPORTS_DIR, 'link-inventory.csv')
export const PROPERTIES_REVIEW_PATH = path.join(REVIEW_DIR, 'properties.csv')
export const SLAVES_PEOPLE_REVIEW_PATH = path.join(REVIEW_DIR, 'people-slaves-in-tredyffrin.csv')
export const MEETING_PEOPLE_REVIEW_PATH = path.join(
	REVIEW_DIR,
	'people-meeting-for-suffering.csv',
)
export const ARCHIVE_IDS_REPORT_PATH = path.join(REPORTS_DIR, 'archive-ids.csv')
export const ARTICLES_NDJSON_PATH = path.join(TRANSFORMED_DIR, 'research-articles.ndjson')
export const IMAGES_NDJSON_PATH = path.join(TRANSFORMED_DIR, 'historical-images.ndjson')
export const PEOPLE_NDJSON_PATH = path.join(TRANSFORMED_DIR, 'people.ndjson')
export const PROPERTIES_NDJSON_PATH = path.join(TRANSFORMED_DIR, 'properties.ndjson')
export const TRANSFORM_WARNINGS_PATH = path.join(REPORTS_DIR, 'transform-warnings.csv')
export const VALIDATE_REPORT_PATH = path.join(REPORTS_DIR, 'validate-summary.json')
