import type {ReactNode} from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import Heading from '@theme/Heading'
import styles from './styles.module.css'

type FeatureItem = {
  title: string
  Svg: React.ComponentType<React.ComponentProps<'svg'>>
  description: ReactNode
  to: string
}

const FeatureList: FeatureItem[] = [
  {
    title: 'The Archive',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    to: '/docs/content-model/the-archive',
    description: (
      <>
        The Archive is a collection of primary source documents, images, and other media related to
        the history of the Tredyffrin Easttown Township.
      </>
    ),
  },
  {
    title: 'The Website',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    to: '/docs/content-model/the-website',
    description: (
      <>
        The Website section contains contemporary curated essays and articles about the history of
        the Tredyffrin Easttown Township.
      </>
    ),
  },
  {
    title: 'Taxonomies and Entities',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    to: '/docs/content-model/taxonomies-and-entities',
    description: (
      <>
        This section contains the taxonomies and entities that are used to organize the content of
        the website and the archive.
      </>
    ),
  },
]

function Feature({title, Svg, description, to}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">
          <Link to={to}>{title}</Link>
        </Heading>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}
