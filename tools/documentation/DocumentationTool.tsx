import {Card} from '@sanity/ui'

export function DocumentationTool() {
  return (
    <Card
      height="fill"
      sizing="border"
      style={{display: 'flex', flexDirection: 'column', minHeight: 0}}
    >
      <iframe
        src="/documentation/"
        title="Documentation"
        style={{
          border: 0,
          flex: 1,
          height: '100%',
          width: '100%',
        }}
      />
    </Card>
  )
}
