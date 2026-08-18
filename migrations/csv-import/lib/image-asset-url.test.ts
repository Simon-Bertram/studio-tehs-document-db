import {describe, expect, test} from 'bun:test'

import {buildImageAssetUrl, relativeImagePath} from './image-asset-url'

describe('relativeImagePath', () => {
	test('uses imageLocation only', () => {
		expect(
			relativeImagePath({
				imageLocation: 'ValleyForge/BakeHouse/BKH1-BakeHousesmall.jpg',
			}),
		).toBe('ValleyForge/BakeHouse/BKH1-BakeHousesmall.jpg')
	})

	test('does not fall back to fileLocation archive notes', () => {
		expect(
			relativeImagePath({
				imageLocation: '',
				fileLocation: '...VFNHP Views & BuildingsBake House',
			} as {imageLocation?: string}),
		).toBeNull()
	})
})

describe('buildImageAssetUrl', () => {
	test('encodes commas in filenames', () => {
		expect(
			buildImageAssetUrl('ValleyForge/StirlingsQuarters/STI3-Interior,Stirlingssmall.jpg'),
		).toBe(
			'https://www.the2nomads.site/TEHSImageDatabase/ValleyForge/StirlingsQuarters/STI3-Interior%2CStirlingssmall.jpg',
		)
	})
})
